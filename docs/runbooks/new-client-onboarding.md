# Runbook: New Client Onboarding

End-to-end flow from first contact to active delivery.

## Prerequisites

- Organization exists in VentureOS
- At least one sub-company configured
- Sales agent and Ops agent active in OpenClaw

## Steps

### 1. Create Lead in Dashboard

Navigate to **Leads > New Lead** and fill in:
- Contact name and email (required)
- Company (select the sub-company handling this client)
- Source (e.g., referral, website, cold outreach)
- Expected value (estimated deal size)
- Notes (any context from initial conversation)

Server action: `createLead(formData)` inserts into `leads` table with stage `new` and score `0`.

### 2. Automatic Lead Scoring and Assignment

The `lead-intake` Trigger.dev workflow fires automatically:
1. Enriches the lead (company size, industry, LinkedIn)
2. Calculates a lead score (0-100) based on fit criteria
3. Assigns to the Sales agent if score >= 40
4. Creates an audit log entry

The lead card in the dashboard updates with the score and assigned agent.

### 3. Generate Proposal

From the lead detail page, click **Generate Proposal**.

Server action: `generateProposal(leadId)` creates a `proposals` row with status `draft`, linked to the lead.

The `proposal-generation` workflow triggers:
1. Pulls lead context, company info, and industry data
2. Sales agent drafts scope, timeline, and pricing
3. Proposal content is saved to the `proposals.content` field
4. Status remains `draft` until human review

### 4. Review and Send Proposal

1. Open the proposal from **Proposals** page
2. Review generated content, edit if needed
3. Click **Send Proposal**

Server action: `sendProposal(proposalId)` updates status to `sent` and records `sent_at`.

In production, this triggers an email via Resend to the lead's contact email.

### 5. Accept Proposal (Convert to Client)

When the prospect accepts:
1. Click **Accept** on the proposal
2. Server action: `acceptProposal(proposalId)` does the following automatically:
   - Updates proposal status to `accepted`
   - Creates a `clients` row from the lead data
   - Updates the lead to stage `won` with `converted_client_id`
   - Creates a `projects` row linked to the new client

### 6. Assign Agents to Project

After conversion:
1. Go to **Agents** page
2. The Ops agent auto-assigns based on project type
3. Typical assignment:
   - **Ops agent**: Project delivery and timeline
   - **Developer agent**: Technical implementation
   - **SEO agent**: If the project involves web presence
   - **Finance agent**: Billing setup and invoicing

### 7. Start Delivery Workflows

Active workflows for the new project:
- **Follow-up sequence**: Automated check-ins with the client
- **Monthly report**: Scheduled performance reporting
- **SEO audit**: If web presence is in scope

Monitor progress in the **Overview** dashboard -- active projects, pending approvals, and agent activity all surface there.

## Rollback

If a proposal was accepted by mistake:
1. There is no automated un-accept. Manually update the proposal status in Supabase SQL Editor.
2. Deactivate the client record if needed.
3. All changes are in `audit_logs` for traceability.

## Alerts

- Lead score below 20: Sales agent flags for manual review
- Proposal not sent within 48 hours: Ops agent sends reminder
- No activity on new project within 72 hours: CEO agent escalation
