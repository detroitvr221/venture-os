# Runbook: Launch Sub-Company

Create and activate a new sub-company within the North Bridge Digital organization.

## Prerequisites

- Owner or admin role in the organization
- Company name, slug, and industry decided
- Brand assets ready (optional but recommended: logo, colors, fonts)

## Steps

### 1. Fill Out New Company Form

Navigate to **Companies > New Company** and fill in:
- **Name** (required): Display name of the company
- **Slug** (required): URL-safe identifier, lowercase letters, numbers, and hyphens only (e.g., `northbridge-digital`)
- **Industry** (optional): Primary industry vertical
- **Website** (optional): Company website URL if it already exists

Server action: `createSubCompany(formData)` does the following:
1. Validates name and slug format
2. Checks slug uniqueness within the organization
3. Creates `sub_companies` row
4. Creates a default `brands` row with:
   - Company name as brand name
   - Default voice guidelines
   - Default color palette (blue/purple)
   - Default fonts (Inter)

### 2. Submit Triggers Approval Workflow

For new company launches, the `launch-company` Trigger.dev workflow fires:
1. Creates an approval request (type: `company_launch`)
2. Notifies the CEO agent and organization admins
3. Workflow pauses until approval is granted

The approval appears in the **Approvals** page.

### 3. Approve in Approvals Queue

Navigate to **Approvals** and find the pending company launch:
1. Review the company details
2. Click **Approve** to proceed or **Reject** with a reason

Server action: `approvePendingApproval(approvalId)`:
- Updates approval status to `approved`
- Resumes the paused `launch-company` workflow

### 4. Company Activated

After approval, the workflow completes:
1. **Brand setup**: Brand record is finalized with voice guidelines
2. **KPI initialization**: Default KPIs created for the company:
   - Revenue target
   - Lead pipeline size
   - Client satisfaction score
   - Website traffic
3. **Default workflows**: Standard workflows linked to the company:
   - Lead intake for this company's pipeline
   - Monthly reporting for this company's KPIs
4. **Audit log**: Company activation recorded with full change details

### 5. Configure Agents and Integrations

After activation, set up company-specific configuration:

**Agent scoping**:
- Memory scope: Agents working on this company only access its memory partition
- Tool permissions: Agents get tools appropriate for the company's services

**Integrations**:
- Connect Stripe product/price for this company's billing
- Set up Resend sending domain if the company has its own domain
- Configure Firecrawl targets for the company's website
- Link Slack channel for notifications (via OpenClaw)

### 6. Launch

The company is now active in North Bridge Digital:
- Appears in the **Companies** list
- Leads can be created under this company
- Agents can be assigned to work on this company's projects
- KPIs begin tracking from launch date

## Post-Launch Checklist

- [ ] Brand voice guidelines reviewed and customized
- [ ] Logo uploaded (if available)
- [ ] Colors updated from defaults
- [ ] At least one agent assigned
- [ ] Stripe product linked for billing
- [ ] First lead created (test the pipeline)
- [ ] Monthly report workflow verified

## Rollback

There is no automated delete for sub-companies (by design, to protect data integrity). To deactivate:
1. Deactivate the company in Supabase by setting an `active` flag or removing from queries
2. Reassign any active leads and projects to another company
3. Archive workflows linked to this company
4. All historical data remains in audit logs
