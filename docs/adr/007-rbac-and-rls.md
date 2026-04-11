# ADR-007: Role-Based Access Control with Row-Level Security

## Status
Accepted

## Context
VentureOS is a multi-tenant platform where organizations must have strict data isolation, and within an organization, different roles (owner, admin, agent, viewer) need different levels of access to resources.

## Decision
We implement access control at two layers:

### Application Layer: RBAC Permission Matrix
Defined in `packages/shared/src/permissions.ts`, the permission matrix maps roles to allowed actions (read, write, delete, approve) on each resource type. Service-layer code calls `assertPermission()` before mutating data.

- **Owner**: Full access to everything
- **Admin**: Full read/write, limited delete, approval authority
- **Agent**: Operational read + write on their domain resources, no delete, no approve
- **Viewer**: Read-only on public-facing resources

### Database Layer: Row-Level Security (RLS)
Every table has RLS enabled with policies that verify the current user is a member of the relevant organization. The `is_org_member()` and `get_org_role()` helper functions provide efficient lookups.

- Read policies: any org member can read their org's data
- Write policies: only owners and admins can mutate data
- Service-role key bypasses RLS for server-side operations

## Consequences
- **Positive**: Defense in depth — even if application logic has a bug, RLS prevents cross-tenant access.
- **Positive**: Single permission matrix is easy to audit and reason about.
- **Negative**: RLS policies add overhead to every database query.
- **Negative**: Debugging permission issues requires understanding both layers.
