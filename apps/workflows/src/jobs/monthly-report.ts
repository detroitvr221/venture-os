// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Monthly Report Workflow
// Aggregates KPIs, leads, revenue, and agent costs into an HTML report.
// ─────────────────────────────────────────────────────────────────────────────

import { task, logger } from '@trigger.dev/sdk/v3';
import { z } from 'zod';
import { createClient } from '@venture-os/db';

// ─── Input Schema ───────────────────────────────────────────────────────────

const MonthlyReportPayload = z.object({
  organization_id: z.string().uuid(),
  year: z.number().int().min(2020).max(2030),
  month: z.number().int().min(1).max(12),
});

type MonthlyReportPayload = z.infer<typeof MonthlyReportPayload>;

// ─── Main Task ──────────────────────────────────────────────────────────────

export const monthlyReportTask = task({
  id: 'monthly-report',
  maxDuration: 120,
  retry: { maxAttempts: 2 },
  run: async (payload: MonthlyReportPayload) => {
    const validated = MonthlyReportPayload.parse(payload);
    const db = createClient();

    const periodStart = new Date(validated.year, validated.month - 1, 1).toISOString();
    const periodEnd = new Date(validated.year, validated.month, 0, 23, 59, 59).toISOString();
    const monthLabel = new Date(validated.year, validated.month - 1).toLocaleString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    logger.info('Generating monthly report', { period: monthLabel, org: validated.organization_id });

    // ─── 1. Leads Metrics ───────────────────────────────────────────────

    const { count: newLeadsCount } = await db
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', validated.organization_id)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    const { count: wonLeadsCount } = await db
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', validated.organization_id)
      .eq('stage', 'won')
      .gte('updated_at', periodStart)
      .lte('updated_at', periodEnd);

    const { count: lostLeadsCount } = await db
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', validated.organization_id)
      .eq('stage', 'lost')
      .gte('updated_at', periodStart)
      .lte('updated_at', periodEnd);

    // ─── 2. Revenue Metrics ─────────────────────────────────────────────

    const { data: paidInvoices } = await db
      .from('invoices')
      .select('amount_paid')
      .eq('organization_id', validated.organization_id)
      .eq('status', 'paid')
      .gte('paid_at', periodStart)
      .lte('paid_at', periodEnd);

    const totalRevenue = (paidInvoices ?? []).reduce(
      (sum: number, inv: { amount_paid: number }) => sum + inv.amount_paid,
      0,
    );

    const { data: openInvoices } = await db
      .from('invoices')
      .select('amount_due')
      .eq('organization_id', validated.organization_id)
      .in('status', ['open', 'draft'])
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);

    const totalOutstanding = (openInvoices ?? []).reduce(
      (sum: number, inv: { amount_due: number }) => sum + inv.amount_due,
      0,
    );

    // ─── 3. Agent Costs ─────────────────────────────────────────────────

    const { data: agentCosts } = await db
      .from('agent_costs')
      .select('agent_name, cost_usd')
      .eq('organization_id', validated.organization_id)
      .gte('recorded_at', periodStart)
      .lte('recorded_at', periodEnd);

    const totalAgentCost = (agentCosts ?? []).reduce(
      (sum: number, c: { cost_usd: number }) => sum + c.cost_usd,
      0,
    );

    const agentCostByName: Record<string, number> = {};
    for (const cost of agentCosts ?? []) {
      const typedCost = cost as { agent_name: string; cost_usd: number };
      agentCostByName[typedCost.agent_name] =
        (agentCostByName[typedCost.agent_name] ?? 0) + typedCost.cost_usd;
    }

    // ─── 4. KPIs ────────────────────────────────────────────────────────

    const periodKey = `${validated.year}-${String(validated.month).padStart(2, '0')}`;
    const { data: kpis } = await db
      .from('kpis')
      .select('name, metric_key, current_value, target_value, unit, trend')
      .eq('organization_id', validated.organization_id)
      .eq('period', periodKey);

    // ─── 5. Client Activity ─────────────────────────────────────────────

    const { count: activeClientsCount } = await db
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', validated.organization_id)
      .eq('status', 'active');

    const { count: projectsActiveCount } = await db
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', validated.organization_id)
      .eq('status', 'active');

    // ─── 6. Generate HTML Report ────────────────────────────────────────

    const html = generateHtmlReport({
      monthLabel,
      leads: {
        new: newLeadsCount ?? 0,
        won: wonLeadsCount ?? 0,
        lost: lostLeadsCount ?? 0,
        conversionRate: (newLeadsCount ?? 0) > 0
          ? Math.round(((wonLeadsCount ?? 0) / (newLeadsCount ?? 1)) * 100)
          : 0,
      },
      revenue: {
        total: totalRevenue,
        outstanding: totalOutstanding,
      },
      agentCost: {
        total: totalAgentCost,
        byAgent: agentCostByName,
      },
      kpis: (kpis ?? []) as Array<{
        name: string;
        metric_key: string;
        current_value: number;
        target_value: number | null;
        unit: string | null;
        trend: string | null;
      }>,
      activeClients: activeClientsCount ?? 0,
      activeProjects: projectsActiveCount ?? 0,
    });

    // ─── 7. Store as document ───────────────────────────────────────────

    const { data: doc, error: docError } = await db
      .from('documents')
      .insert({
        organization_id: validated.organization_id,
        title: `Monthly Report — ${monthLabel}`,
        content: html,
        document_type: 'monthly_report',
        metadata: {
          year: validated.year,
          month: validated.month,
          generated_at: new Date().toISOString(),
          revenue: totalRevenue,
          agent_costs: totalAgentCost,
          new_leads: newLeadsCount ?? 0,
        },
      })
      .select('id')
      .single();

    if (docError) {
      logger.error('Failed to store report document', { error: docError.message });
    }

    // ─── 8. Audit log ──────────────────────────────────────────────────

    await db.from('audit_logs').insert({
      organization_id: validated.organization_id,
      actor_type: 'system',
      actor_id: 'monthly-report-workflow',
      action: 'create',
      resource_type: 'document',
      resource_id: doc?.id ?? 'unknown',
      changes: {
        report_period: monthLabel,
        revenue: totalRevenue,
        agent_costs: totalAgentCost,
        new_leads: newLeadsCount ?? 0,
      },
    });

    // ─── 9. Notify stakeholders ─────────────────────────────────────────

    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackUrl) {
      await fetch(slackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text:
            `:bar_chart: *Monthly Report — ${monthLabel}*\n` +
            `> Revenue: $${totalRevenue.toLocaleString()}\n` +
            `> Agent Costs: $${totalAgentCost.toFixed(2)}\n` +
            `> New Leads: ${newLeadsCount ?? 0} | Won: ${wonLeadsCount ?? 0} | Lost: ${lostLeadsCount ?? 0}\n` +
            `> Active Clients: ${activeClientsCount ?? 0} | Active Projects: ${projectsActiveCount ?? 0}`,
        }),
      }).catch((err) => logger.error('Slack notification failed', { error: err }));
    }

    logger.info('Monthly report generated', {
      period: monthLabel,
      doc_id: doc?.id,
      revenue: totalRevenue,
    });

    return {
      document_id: doc?.id,
      period: monthLabel,
      revenue: totalRevenue,
      agent_costs: totalAgentCost,
      new_leads: newLeadsCount ?? 0,
      won_leads: wonLeadsCount ?? 0,
    };
  },
});

// ─── HTML Report Generator ──────────────────────────────────────────────────

function generateHtmlReport(data: {
  monthLabel: string;
  leads: { new: number; won: number; lost: number; conversionRate: number };
  revenue: { total: number; outstanding: number };
  agentCost: { total: number; byAgent: Record<string, number> };
  kpis: Array<{
    name: string;
    metric_key: string;
    current_value: number;
    target_value: number | null;
    unit: string | null;
    trend: string | null;
  }>;
  activeClients: number;
  activeProjects: number;
}): string {
  const agentRows = Object.entries(data.agentCost.byAgent)
    .sort(([, a], [, b]) => b - a)
    .map(
      ([name, cost]) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #222;">${name}</td><td style="padding:8px;border-bottom:1px solid #222;text-align:right;">$${cost.toFixed(2)}</td></tr>`,
    )
    .join('');

  const kpiRows = data.kpis
    .map(
      (k) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #222;">${k.name}</td>
          <td style="padding:8px;border-bottom:1px solid #222;text-align:right;">${k.current_value}${k.unit ? ' ' + k.unit : ''}</td>
          <td style="padding:8px;border-bottom:1px solid #222;text-align:right;">${k.target_value ?? '-'}${k.target_value && k.unit ? ' ' + k.unit : ''}</td>
          <td style="padding:8px;border-bottom:1px solid #222;text-align:center;">${k.trend === 'up' ? '&#9650;' : k.trend === 'down' ? '&#9660;' : '&#8594;'}</td>
        </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Monthly Report — ${data.monthLabel}</title></head>
<body style="font-family:system-ui,sans-serif;background:#111;color:#e5e5e5;padding:40px;max-width:800px;margin:0 auto;">
  <h1 style="color:#fff;border-bottom:2px solid #3b82f6;padding-bottom:16px;">Monthly Report — ${data.monthLabel}</h1>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin:24px 0;">
    <div style="background:#0a0a0a;border:1px solid #222;border-radius:12px;padding:20px;text-align:center;">
      <div style="color:#888;font-size:14px;">Revenue</div>
      <div style="color:#22c55e;font-size:28px;font-weight:bold;margin-top:8px;">$${data.revenue.total.toLocaleString()}</div>
    </div>
    <div style="background:#0a0a0a;border:1px solid #222;border-radius:12px;padding:20px;text-align:center;">
      <div style="color:#888;font-size:14px;">Agent Costs</div>
      <div style="color:#ef4444;font-size:28px;font-weight:bold;margin-top:8px;">$${data.agentCost.total.toFixed(2)}</div>
    </div>
    <div style="background:#0a0a0a;border:1px solid #222;border-radius:12px;padding:20px;text-align:center;">
      <div style="color:#888;font-size:14px;">Net Margin</div>
      <div style="color:#3b82f6;font-size:28px;font-weight:bold;margin-top:8px;">$${(data.revenue.total - data.agentCost.total).toLocaleString()}</div>
    </div>
  </div>

  <h2 style="color:#fff;margin-top:32px;">Lead Pipeline</h2>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0;">
    <div style="background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:16px;text-align:center;">
      <div style="color:#888;font-size:12px;">New Leads</div>
      <div style="color:#3b82f6;font-size:24px;font-weight:bold;">${data.leads.new}</div>
    </div>
    <div style="background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:16px;text-align:center;">
      <div style="color:#888;font-size:12px;">Won</div>
      <div style="color:#22c55e;font-size:24px;font-weight:bold;">${data.leads.won}</div>
    </div>
    <div style="background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:16px;text-align:center;">
      <div style="color:#888;font-size:12px;">Lost</div>
      <div style="color:#ef4444;font-size:24px;font-weight:bold;">${data.leads.lost}</div>
    </div>
    <div style="background:#0a0a0a;border:1px solid #222;border-radius:8px;padding:16px;text-align:center;">
      <div style="color:#888;font-size:12px;">Conversion</div>
      <div style="color:#eab308;font-size:24px;font-weight:bold;">${data.leads.conversionRate}%</div>
    </div>
  </div>

  <h2 style="color:#fff;margin-top:32px;">Operations</h2>
  <p style="color:#888;">Active Clients: <strong style="color:#fff;">${data.activeClients}</strong> | Active Projects: <strong style="color:#fff;">${data.activeProjects}</strong> | Outstanding Invoices: <strong style="color:#eab308;">$${data.revenue.outstanding.toLocaleString()}</strong></p>

  ${kpiRows ? `<h2 style="color:#fff;margin-top:32px;">KPIs</h2>
  <table style="width:100%;border-collapse:collapse;background:#0a0a0a;border:1px solid #222;border-radius:8px;">
    <thead><tr style="border-bottom:2px solid #333;">
      <th style="padding:10px;text-align:left;color:#888;">KPI</th>
      <th style="padding:10px;text-align:right;color:#888;">Current</th>
      <th style="padding:10px;text-align:right;color:#888;">Target</th>
      <th style="padding:10px;text-align:center;color:#888;">Trend</th>
    </tr></thead>
    <tbody>${kpiRows}</tbody>
  </table>` : ''}

  ${agentRows ? `<h2 style="color:#fff;margin-top:32px;">Agent Cost Breakdown</h2>
  <table style="width:100%;border-collapse:collapse;background:#0a0a0a;border:1px solid #222;border-radius:8px;">
    <thead><tr style="border-bottom:2px solid #333;">
      <th style="padding:10px;text-align:left;color:#888;">Agent</th>
      <th style="padding:10px;text-align:right;color:#888;">Cost (USD)</th>
    </tr></thead>
    <tbody>${agentRows}</tbody>
    <tfoot><tr style="border-top:2px solid #333;">
      <td style="padding:10px;font-weight:bold;color:#fff;">Total</td>
      <td style="padding:10px;text-align:right;font-weight:bold;color:#ef4444;">$${data.agentCost.total.toFixed(2)}</td>
    </tr></tfoot>
  </table>` : ''}

  <footer style="margin-top:40px;padding-top:20px;border-top:1px solid #222;color:#666;font-size:12px;">
    Generated by VentureOS on ${new Date().toISOString().split('T')[0]}
  </footer>
</body>
</html>`;
}
