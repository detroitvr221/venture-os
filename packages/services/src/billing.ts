// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Billing Service
// Subscription management, usage metering, invoicing, and Stripe sync
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@venture-os/db';
import type {
  Subscription,
  SubscriptionStatus,
  Invoice,
  InvoiceStatus,
  UsageMeter,
  BillingInterval,
} from '@venture-os/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BillingServiceDeps {
  db: SupabaseClient;
  /** Optional Stripe client — if not provided, Stripe sync is a no-op. */
  stripe?: StripeAdapter;
}

/** Minimal interface for Stripe operations. Implement with your Stripe SDK. */
export interface StripeAdapter {
  createSubscription(params: {
    customer_id: string;
    price_id: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; status: string; current_period_start: number; current_period_end: number }>;

  cancelSubscription(subscriptionId: string): Promise<{ id: string; status: string }>;

  createInvoice(params: {
    customer_id: string;
    line_items: Array<{ description: string; amount: number; quantity: number }>;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; number: string; amount_due: number; status: string }>;

  finalizeInvoice(invoiceId: string): Promise<{ id: string; status: string }>;
}

export interface CreateSubscriptionInput {
  organization_id: string;
  plan_name: string;
  interval: BillingInterval;
  stripe_customer_id?: string;
  stripe_price_id?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordUsageInput {
  organization_id: string;
  meter_name: string;
  value: number;
  period_start: string;
  period_end: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateInvoiceInput {
  organization_id: string;
  subscription_id?: string;
  line_items: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  due_date?: string;
}

interface ActorInfo {
  actor_type: 'user' | 'agent' | 'system';
  actor_id: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class BillingService {
  private db: SupabaseClient;
  private stripe: StripeAdapter | null;

  constructor(deps: BillingServiceDeps) {
    this.db = deps.db;
    this.stripe = deps.stripe ?? null;
  }

  // ─── Subscriptions ───────────────────────────────────────────────��─────

  /**
   * Create a new subscription. Optionally syncs with Stripe.
   */
  async createSubscription(
    input: CreateSubscriptionInput,
    actor: ActorInfo,
  ): Promise<Subscription> {
    const now = new Date();
    let stripeSubId: string | null = null;
    let periodStart = now.toISOString();
    let periodEnd = this.calculatePeriodEnd(now, input.interval).toISOString();

    // Sync with Stripe if configured
    if (this.stripe && input.stripe_customer_id && input.stripe_price_id) {
      const stripeSub = await this.stripe.createSubscription({
        customer_id: input.stripe_customer_id,
        price_id: input.stripe_price_id,
        metadata: { organization_id: input.organization_id },
      });
      stripeSubId = stripeSub.id;
      periodStart = new Date(stripeSub.current_period_start * 1000).toISOString();
      periodEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
    }

    const { data, error } = await this.db
      .from('subscriptions')
      .insert({
        organization_id: input.organization_id,
        stripe_subscription_id: stripeSubId,
        plan_name: input.plan_name,
        status: 'active',
        interval: input.interval,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create subscription: ${error.message}`);

    await this.audit(input.organization_id, actor, 'create', 'subscription', data.id, {
      plan_name: input.plan_name,
      interval: input.interval,
    });

    return data as Subscription;
  }

  /**
   * Update subscription status.
   */
  async updateSubscriptionStatus(
    id: string,
    organization_id: string,
    status: SubscriptionStatus,
    actor: ActorInfo,
  ): Promise<Subscription> {
    const updatePayload: Record<string, unknown> = { status };

    if (status === 'cancelled') {
      updatePayload['cancel_at'] = new Date().toISOString();

      // Cancel in Stripe if synced
      const { data: sub } = await this.db
        .from('subscriptions')
        .select('stripe_subscription_id')
        .eq('id', id)
        .single();

      if (sub?.stripe_subscription_id && this.stripe) {
        await this.stripe.cancelSubscription(sub.stripe_subscription_id);
      }
    }

    const { data, error } = await this.db
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update subscription: ${error.message}`);

    await this.audit(organization_id, actor, 'update', 'subscription', id, {
      status,
    });

    return data as Subscription;
  }

  /**
   * Get the active subscription for an organization.
   */
  async getActiveSubscription(organization_id: string): Promise<Subscription | null> {
    const { data, error } = await this.db
      .from('subscriptions')
      .select()
      .eq('organization_id', organization_id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }
    return (data as Subscription) ?? null;
  }

  // ─── Usage Metering ────────────────────────────────────────────────────

  /**
   * Record a usage metric value. Upserts on (org, meter_name, period).
   */
  async recordUsage(input: RecordUsageInput): Promise<UsageMeter> {
    // Check if a meter already exists for this period
    const { data: existing } = await this.db
      .from('usage_meters')
      .select()
      .eq('organization_id', input.organization_id)
      .eq('meter_name', input.meter_name)
      .eq('period_start', input.period_start)
      .eq('period_end', input.period_end)
      .single();

    if (existing) {
      // Increment existing meter
      const { data, error } = await this.db
        .from('usage_meters')
        .update({
          value: (existing as UsageMeter).value + input.value,
          metadata: {
            ...(existing as UsageMeter).metadata,
            ...input.metadata,
            last_updated: new Date().toISOString(),
          },
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update usage: ${error.message}`);
      return data as UsageMeter;
    }

    // Create new meter
    const { data, error } = await this.db
      .from('usage_meters')
      .insert({
        organization_id: input.organization_id,
        meter_name: input.meter_name,
        value: input.value,
        period_start: input.period_start,
        period_end: input.period_end,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record usage: ${error.message}`);
    return data as UsageMeter;
  }

  /**
   * Get usage summary for an organization within a period.
   */
  async getUsageSummary(
    organization_id: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<UsageMeter[]> {
    const { data, error } = await this.db
      .from('usage_meters')
      .select()
      .eq('organization_id', organization_id)
      .gte('period_start', periodStart)
      .lte('period_end', periodEnd)
      .order('meter_name');

    if (error) throw new Error(`Failed to fetch usage: ${error.message}`);
    return (data ?? []) as UsageMeter[];
  }

  // ─── Invoicing ─────────────────────────────────────────────────────────

  /**
   * Generate a new invoice. Optionally syncs with Stripe.
   */
  async generateInvoice(
    input: GenerateInvoiceInput,
    actor: ActorInfo,
  ): Promise<Invoice> {
    const totalAmount = input.line_items.reduce(
      (sum, item) => sum + item.amount * item.quantity,
      0,
    );

    const invoiceNumber = await this.generateInvoiceNumber(input.organization_id);

    let stripeInvoiceId: string | null = null;

    // Sync to Stripe if configured
    if (this.stripe) {
      const { data: org } = await this.db
        .from('organizations')
        .select('stripe_customer_id')
        .eq('id', input.organization_id)
        .single();

      if (org?.stripe_customer_id) {
        const stripeInvoice = await this.stripe.createInvoice({
          customer_id: org.stripe_customer_id,
          line_items: input.line_items,
          metadata: { organization_id: input.organization_id },
        });
        stripeInvoiceId = stripeInvoice.id;
      }
    }

    const { data, error } = await this.db
      .from('invoices')
      .insert({
        organization_id: input.organization_id,
        subscription_id: input.subscription_id ?? null,
        stripe_invoice_id: stripeInvoiceId,
        number: invoiceNumber,
        status: 'draft',
        amount_due: totalAmount,
        amount_paid: 0,
        currency: 'usd',
        line_items: input.line_items,
        due_date: input.due_date ?? this.defaultDueDate(),
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create invoice: ${error.message}`);

    await this.audit(input.organization_id, actor, 'create', 'invoice', data.id, {
      number: invoiceNumber,
      amount_due: totalAmount,
      line_items_count: input.line_items.length,
    });

    return data as Invoice;
  }

  /**
   * Update invoice status (e.g., when payment is received).
   */
  async updateInvoiceStatus(
    id: string,
    organization_id: string,
    status: InvoiceStatus,
    actor: ActorInfo,
  ): Promise<Invoice> {
    const updatePayload: Record<string, unknown> = { status };

    if (status === 'paid') {
      const { data: invoice } = await this.db
        .from('invoices')
        .select('amount_due')
        .eq('id', id)
        .single();
      updatePayload['amount_paid'] = invoice?.amount_due ?? 0;
      updatePayload['paid_at'] = new Date().toISOString();
    }

    const { data, error } = await this.db
      .from('invoices')
      .update(updatePayload)
      .eq('id', id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update invoice: ${error.message}`);

    await this.audit(organization_id, actor, 'update', 'invoice', id, { status });

    return data as Invoice;
  }

  /**
   * List invoices for an organization.
   */
  async listInvoices(
    organization_id: string,
    options?: { status?: InvoiceStatus; page?: number; page_size?: number },
  ): Promise<{ invoices: Invoice[]; total: number }> {
    const pageSize = Math.min(options?.page_size ?? 25, 100);
    const page = options?.page ?? 1;
    const offset = (page - 1) * pageSize;

    let query = this.db
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (options?.status) {
      query = query.eq('status', options.status);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list invoices: ${error.message}`);

    return {
      invoices: (data ?? []) as Invoice[],
      total: count ?? 0,
    };
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private calculatePeriodEnd(start: Date, interval: BillingInterval): Date {
    const end = new Date(start);
    switch (interval) {
      case 'monthly':
        end.setMonth(end.getMonth() + 1);
        break;
      case 'quarterly':
        end.setMonth(end.getMonth() + 3);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }

  private async generateInvoiceNumber(organization_id: string): Promise<string> {
    const { count } = await this.db
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id);

    const seq = (count ?? 0) + 1;
    const year = new Date().getFullYear();
    return `INV-${year}-${String(seq).padStart(5, '0')}`;
  }

  private defaultDueDate(): string {
    const due = new Date();
    due.setDate(due.getDate() + 30); // Net 30
    return due.toISOString();
  }

  private async audit(
    organization_id: string,
    actor: ActorInfo,
    action: string,
    resource_type: string,
    resource_id: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    await this.db.from('audit_logs').insert({
      organization_id,
      actor_type: actor.actor_type,
      actor_id: actor.actor_id,
      action,
      resource_type,
      resource_id,
      changes,
    });
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createBillingService(deps: BillingServiceDeps): BillingService {
  return new BillingService(deps);
}
