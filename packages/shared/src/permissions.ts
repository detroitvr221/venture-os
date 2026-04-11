// ─────────────────────────────────────────────────────────────────────────────
// VentureOS — Role-based permission matrix
// ─────────────────────────────────────────────────────────────────────────────

import type { OrgMemberRole } from './types';

/** Actions that can be performed on a resource. */
export type PermissionAction = 'read' | 'write' | 'delete' | 'approve';

/** Every resource type in the system that participates in RBAC. */
export type ResourceType =
  | 'organization'
  | 'organization_member'
  | 'sub_company'
  | 'brand'
  | 'lead'
  | 'client'
  | 'contact'
  | 'project'
  | 'task'
  | 'proposal'
  | 'website'
  | 'website_audit'
  | 'seo_finding'
  | 'ai_assessment'
  | 'agent'
  | 'agent_thread'
  | 'agent_tool_call'
  | 'agent_cost'
  | 'memory'
  | 'memory_entity'
  | 'memory_edge'
  | 'knowledge_source'
  | 'workflow'
  | 'workflow_run'
  | 'workflow_step'
  | 'approval'
  | 'subscription'
  | 'invoice'
  | 'usage_meter'
  | 'payout'
  | 'campaign'
  | 'outreach_event'
  | 'email_log'
  | 'sms_log'
  | 'call_log'
  | 'consent_record'
  | 'audit_log'
  | 'integration'
  | 'playbook'
  | 'kpi';

/**
 * The permission matrix.
 * `true` means the role has the permission; `false` or absent means denied.
 */
type PermissionMatrix = Record<
  OrgMemberRole,
  Record<PermissionAction, ResourceType[]>
>;

const ALL_RESOURCES: ResourceType[] = [
  'organization',
  'organization_member',
  'sub_company',
  'brand',
  'lead',
  'client',
  'contact',
  'project',
  'task',
  'proposal',
  'website',
  'website_audit',
  'seo_finding',
  'ai_assessment',
  'agent',
  'agent_thread',
  'agent_tool_call',
  'agent_cost',
  'memory',
  'memory_entity',
  'memory_edge',
  'knowledge_source',
  'workflow',
  'workflow_run',
  'workflow_step',
  'approval',
  'subscription',
  'invoice',
  'usage_meter',
  'payout',
  'campaign',
  'outreach_event',
  'email_log',
  'sms_log',
  'call_log',
  'consent_record',
  'audit_log',
  'integration',
  'playbook',
  'kpi',
];

/** Read-only resources that even agents need visibility into. */
const OPERATIONAL_READ: ResourceType[] = [
  'lead',
  'client',
  'contact',
  'project',
  'task',
  'proposal',
  'website',
  'website_audit',
  'seo_finding',
  'ai_assessment',
  'agent',
  'agent_thread',
  'agent_tool_call',
  'memory',
  'memory_entity',
  'memory_edge',
  'knowledge_source',
  'workflow',
  'workflow_run',
  'workflow_step',
  'approval',
  'campaign',
  'outreach_event',
  'email_log',
  'sms_log',
  'call_log',
  'consent_record',
  'playbook',
  'kpi',
];

/** Resources agents can mutate as part of their workflows. */
const AGENT_WRITE: ResourceType[] = [
  'lead',
  'client',
  'contact',
  'project',
  'task',
  'proposal',
  'website',
  'website_audit',
  'seo_finding',
  'ai_assessment',
  'agent_thread',
  'agent_tool_call',
  'agent_cost',
  'memory',
  'memory_entity',
  'memory_edge',
  'knowledge_source',
  'workflow_run',
  'workflow_step',
  'campaign',
  'outreach_event',
  'email_log',
  'sms_log',
  'call_log',
  'kpi',
];

export const PERMISSION_MATRIX: PermissionMatrix = {
  // ─── Owner — full access to everything ───────────────────────────────
  owner: {
    read: ALL_RESOURCES,
    write: ALL_RESOURCES,
    delete: ALL_RESOURCES,
    approve: ALL_RESOURCES,
  },

  // ─── Admin — full read/write, limited delete, full approve ──────────
  admin: {
    read: ALL_RESOURCES,
    write: ALL_RESOURCES,
    delete: [
      'lead',
      'client',
      'contact',
      'project',
      'task',
      'proposal',
      'website',
      'website_audit',
      'seo_finding',
      'ai_assessment',
      'memory',
      'memory_entity',
      'memory_edge',
      'knowledge_source',
      'campaign',
      'outreach_event',
      'playbook',
      'kpi',
    ],
    approve: [
      'approval',
      'proposal',
      'workflow_run',
      'campaign',
      'payout',
    ],
  },

  // ─── Agent — operational read + write, no delete, no approve ────────
  agent: {
    read: OPERATIONAL_READ,
    write: AGENT_WRITE,
    delete: [],
    approve: [],
  },

  // ─── Viewer — read-only, nothing else ───────────────────────────────
  viewer: {
    read: [
      'organization',
      'sub_company',
      'brand',
      'lead',
      'client',
      'contact',
      'project',
      'task',
      'proposal',
      'website',
      'website_audit',
      'seo_finding',
      'campaign',
      'kpi',
      'audit_log',
    ],
    write: [],
    delete: [],
    approve: [],
  },
};

// ─── Helper functions ────────────────────────────────────────────────────────

/**
 * Check whether a given role has a specific permission on a resource type.
 */
export function hasPermission(
  role: OrgMemberRole,
  action: PermissionAction,
  resource: ResourceType,
): boolean {
  const allowed = PERMISSION_MATRIX[role]?.[action];
  if (!allowed) return false;
  return allowed.includes(resource);
}

/**
 * Return every action a role can perform on a given resource.
 */
export function getAllowedActions(
  role: OrgMemberRole,
  resource: ResourceType,
): PermissionAction[] {
  const actions: PermissionAction[] = ['read', 'write', 'delete', 'approve'];
  return actions.filter((action) => hasPermission(role, action, resource));
}

/**
 * Throws if the role lacks the requested permission.
 * Use in service-layer guards.
 */
export function assertPermission(
  role: OrgMemberRole,
  action: PermissionAction,
  resource: ResourceType,
): void {
  if (!hasPermission(role, action, resource)) {
    throw new Error(
      `Permission denied: role "${role}" cannot "${action}" resource "${resource}"`,
    );
  }
}
