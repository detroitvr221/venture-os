// ─────────────────────────────────────────────────────────────────────────────
// North Bridge Digital — Approval Service
// Create, approve, reject approval requests and resume paused workflows
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@venture-os/db';
import type {
  Approval,
  ApprovalStatus,
  WorkflowRun,
} from '@venture-os/shared';
import { assertPermission, type OrgMemberRole } from '@venture-os/shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApprovalServiceDeps {
  db: SupabaseClient;
}

export interface CreateApprovalInput {
  organization_id: string;
  workflow_run_id?: string;
  resource_type: string;
  resource_id: string;
  requested_by: string; // agent name or user_id
  reason?: string;
  context?: Record<string, unknown>;
  expires_at?: string;
}

export interface DecideApprovalInput {
  approval_id: string;
  organization_id: string;
  decided_by: string;
  status: 'approved' | 'rejected';
  reason?: string;
}

export interface ListApprovalsOptions {
  organization_id: string;
  status?: ApprovalStatus;
  resource_type?: string;
  requested_by?: string;
  page?: number;
  page_size?: number;
}

interface ActorInfo {
  actor_type: 'user' | 'agent' | 'system';
  actor_id: string;
  role: OrgMemberRole;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ApprovalService {
  private db: SupabaseClient;

  constructor(deps: ApprovalServiceDeps) {
    this.db = deps.db;
  }

  /**
   * Create a new approval request.
   * If linked to a workflow run, the run is paused until the approval is decided.
   */
  async create(input: CreateApprovalInput, actor: ActorInfo): Promise<Approval> {
    const { data, error } = await this.db
      .from('approvals')
      .insert({
        organization_id: input.organization_id,
        workflow_run_id: input.workflow_run_id ?? null,
        resource_type: input.resource_type,
        resource_id: input.resource_id,
        requested_by: input.requested_by,
        status: 'pending',
        reason: input.reason ?? null,
        context: input.context ?? {},
        expires_at: input.expires_at ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create approval: ${error.message}`);
    const approval = data as Approval;

    // If linked to a workflow run, pause it
    if (input.workflow_run_id) {
      await this.pauseWorkflowRun(input.organization_id, input.workflow_run_id);
    }

    await this.audit(input.organization_id, actor, 'create', 'approval', approval.id, {
      resource_type: input.resource_type,
      resource_id: input.resource_id,
      requested_by: input.requested_by,
    });

    return approval;
  }

  /**
   * Approve an approval request.
   * Only users with the 'approve' permission on the resource type can approve.
   */
  async approve(input: DecideApprovalInput, actor: ActorInfo): Promise<Approval> {
    return this.decide({ ...input, status: 'approved' }, actor);
  }

  /**
   * Reject an approval request.
   */
  async reject(input: DecideApprovalInput, actor: ActorInfo): Promise<Approval> {
    return this.decide({ ...input, status: 'rejected' }, actor);
  }

  /**
   * Process an approval decision (approve or reject).
   */
  private async decide(input: DecideApprovalInput, actor: ActorInfo): Promise<Approval> {
    // Fetch the approval to check permissions
    const existing = await this.getById(input.approval_id, input.organization_id);
    if (!existing) throw new Error(`Approval not found: ${input.approval_id}`);
    if (existing.status !== 'pending') {
      throw new Error(`Approval is already ${existing.status}`);
    }

    // Check if the approval has expired
    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      throw new Error('Approval request has expired');
    }

    // Verify the actor has permission to approve this resource type
    assertPermission(actor.role, 'approve', existing.resource_type as any);

    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from('approvals')
      .update({
        status: input.status,
        decided_by: input.decided_by,
        reason: input.reason ?? existing.reason,
        decided_at: now,
      })
      .eq('id', input.approval_id)
      .eq('organization_id', input.organization_id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update approval: ${error.message}`);
    const approval = data as Approval;

    // If approved and linked to a workflow, resume it
    if (input.status === 'approved' && approval.workflow_run_id) {
      await this.resumeWorkflowRun(input.organization_id, approval.workflow_run_id);
    }

    // If rejected and linked to a workflow, fail it
    if (input.status === 'rejected' && approval.workflow_run_id) {
      await this.failWorkflowRun(
        input.organization_id,
        approval.workflow_run_id,
        `Approval rejected: ${input.reason ?? 'No reason provided'}`,
      );
    }

    await this.audit(
      input.organization_id,
      actor,
      input.status === 'approved' ? 'approve' : 'reject',
      'approval',
      approval.id,
      {
        resource_type: approval.resource_type,
        resource_id: approval.resource_id,
        decided_by: input.decided_by,
        reason: input.reason,
      },
    );

    return approval;
  }

  /**
   * Get a single approval by ID.
   */
  async getById(id: string, organization_id: string): Promise<Approval | null> {
    const { data, error } = await this.db
      .from('approvals')
      .select()
      .eq('id', id)
      .eq('organization_id', organization_id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch approval: ${error.message}`);
    }
    return (data as Approval) ?? null;
  }

  /**
   * List approvals with filtering and pagination.
   */
  async list(options: ListApprovalsOptions): Promise<{ approvals: Approval[]; total: number }> {
    const pageSize = Math.min(options.page_size ?? 25, 100);
    const page = options.page ?? 1;
    const offset = (page - 1) * pageSize;

    let query = this.db
      .from('approvals')
      .select('*', { count: 'exact' })
      .eq('organization_id', options.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (options.status) {
      query = query.eq('status', options.status);
    }
    if (options.resource_type) {
      query = query.eq('resource_type', options.resource_type);
    }
    if (options.requested_by) {
      query = query.eq('requested_by', options.requested_by);
    }

    const { data, error, count } = await query;
    if (error) throw new Error(`Failed to list approvals: ${error.message}`);

    return {
      approvals: (data ?? []) as Approval[],
      total: count ?? 0,
    };
  }

  /**
   * Get all pending approvals for an organization.
   * Useful for dashboards and notification systems.
   */
  async getPending(organization_id: string): Promise<Approval[]> {
    const { data, error } = await this.db
      .from('approvals')
      .select()
      .eq('organization_id', organization_id)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch pending approvals: ${error.message}`);
    return (data ?? []) as Approval[];
  }

  /**
   * Clean up expired approvals.
   * Marks expired pending approvals as rejected with an expiration reason.
   */
  async cleanupExpired(organization_id: string): Promise<number> {
    const now = new Date().toISOString();

    const { data, error } = await this.db
      .from('approvals')
      .update({
        status: 'rejected',
        reason: 'Automatically rejected: approval expired',
        decided_by: 'system',
        decided_at: now,
      })
      .eq('organization_id', organization_id)
      .eq('status', 'pending')
      .lt('expires_at', now)
      .select('id, workflow_run_id');

    if (error) throw new Error(`Failed to cleanup expired approvals: ${error.message}`);

    // Fail any linked workflow runs
    if (data) {
      for (const approval of data) {
        if (approval.workflow_run_id) {
          await this.failWorkflowRun(
            organization_id,
            approval.workflow_run_id,
            'Linked approval expired',
          );
        }
      }
    }

    return data?.length ?? 0;
  }

  // ─── Workflow Integration ──────────────────────────────────────────────

  /**
   * Pause a workflow run (when an approval is needed).
   */
  private async pauseWorkflowRun(
    organization_id: string,
    workflow_run_id: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('workflow_runs')
      .update({ status: 'paused' })
      .eq('id', workflow_run_id)
      .eq('organization_id', organization_id)
      .eq('status', 'running');

    if (error) {
      console.error(`Failed to pause workflow run ${workflow_run_id}: ${error.message}`);
    }
  }

  /**
   * Resume a paused workflow run (after approval).
   */
  private async resumeWorkflowRun(
    organization_id: string,
    workflow_run_id: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('workflow_runs')
      .update({ status: 'running' })
      .eq('id', workflow_run_id)
      .eq('organization_id', organization_id)
      .eq('status', 'paused');

    if (error) {
      console.error(`Failed to resume workflow run ${workflow_run_id}: ${error.message}`);
    }
  }

  /**
   * Fail a workflow run (after rejection or expiration).
   */
  private async failWorkflowRun(
    organization_id: string,
    workflow_run_id: string,
    errorMsg: string,
  ): Promise<void> {
    const { error } = await this.db
      .from('workflow_runs')
      .update({
        status: 'failed',
        error: errorMsg,
        completed_at: new Date().toISOString(),
      })
      .eq('id', workflow_run_id)
      .eq('organization_id', organization_id);

    if (error) {
      console.error(`Failed to fail workflow run ${workflow_run_id}: ${error.message}`);
    }
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

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

export function createApprovalService(deps: ApprovalServiceDeps): ApprovalService {
  return new ApprovalService(deps);
}
