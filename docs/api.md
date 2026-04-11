# North Bridge Digital API Documentation

## API Routes

All API routes are defined in `apps/web/app/api/`. They handle external integrations (OpenClaw) and are not user-facing.

---

### POST /api/openclaw/webhook

Receives action results from OpenClaw agents and routes them to the appropriate database tables.

**Authentication**: Bearer token via `Authorization` header. Must match `OPENCLAW_WEBHOOK_SECRET`.

**Request Body**:

```typescript
{
  action: string;              // Required. One of: "agent_result", "tool_call_completion", "memory_update", "lead_update"
  organization_id: string;     // Required. UUID of the organization
  data: Record<string, unknown>; // Required. Action-specific payload
  agent_id?: string;           // Optional. ID of the agent that produced the result
  run_id?: string;             // Optional. OpenClaw run ID for tracking
  timestamp?: string;          // Optional. ISO 8601 timestamp
}
```

**Actions**:

| Action | What It Does | Key Data Fields |
|--------|-------------|-----------------|
| `agent_result` | Stores tool call result and cost in `agent_tool_calls` and `agent_costs` | `thread_id`, `tool_name`, `input`, `output`, `cost_usd`, `model`, `input_tokens`, `output_tokens` |
| `tool_call_completion` | Updates an existing tool call with output | `tool_call_id`, `output`, `duration_ms`, `error` |
| `memory_update` | Inserts a new memory record | `content`, `scope`, `scope_id`, `metadata` |
| `lead_update` | Updates lead fields (stage, score, assignment) | `lead_id`, `stage`, `score`, `assigned_agent`, `notes` |
| *(any other)* | Logged to `audit_logs` as a generic webhook event | Entire `data` object stored in changes |

**Response**:

```json
// 200 OK
{ "processed": true, "action": "agent_result" }

// 400 Bad Request
{ "error": "Missing required fields: action, organization_id" }

// 401 Unauthorized
{ "error": "Unauthorized" }

// 500 Internal Server Error
{ "error": "Internal server error processing webhook" }
```

---

### POST /api/openclaw/trigger

Sends a request to the OpenClaw gateway to start an agent run. Creates a tracking thread in the database.

**Authentication**: Bearer token via `Authorization` header. Must match `OPENCLAW_WEBHOOK_SECRET`.

**Request Body**:

```typescript
{
  agent_id: string;            // Required. Agent to run (e.g., "sales", "seo", "developer")
  message: string;             // Required. Instruction/prompt for the agent
  organization_id: string;     // Required. UUID of the organization
  context?: Record<string, unknown>; // Optional. Additional context passed to the agent
  tools?: string[];            // Optional. Tool names the agent can use
  max_tokens?: number;         // Optional. Max response tokens (default: 4096)
}
```

**What It Does**:

1. Validates auth and required fields
2. Creates an `agent_threads` row with status `open`
3. POSTs to the OpenClaw gateway at `OPENCLAW_GATEWAY_URL/hooks/`
4. Returns the `run_id` and `thread_id` for tracking

**Response**:

```json
// 200 OK
{
  "run_id": "uuid",
  "thread_id": "uuid",
  "status": "triggered",
  "agent_id": "sales"
}

// 400 Bad Request
{ "error": "Missing required fields: agent_id, message, organization_id" }

// 401 Unauthorized
{ "error": "Unauthorized" }

// 500 Internal Server Error
{ "error": "OPENCLAW_API_KEY not configured" }

// 502 Bad Gateway
{ "error": "Gateway error: 503" }
```

---

## Server Actions

All server actions are defined in `apps/web/app/actions.ts`. They run server-side, use the Supabase service role client, and enforce validation and audit logging.

Every action returns `ActionResult<T>`:

```typescript
type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

---

### createLead(formData: FormData)

Creates a new lead in the CRM pipeline.

**Parameters** (via FormData):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_name` | string | Yes | Lead's full name |
| `contact_email` | string | Yes | Lead's email (must contain @) |
| `company_id` | string | Yes | UUID of the sub-company |
| `organization_id` | string | No | Defaults to `DEFAULT_ORGANIZATION_ID` |
| `contact_phone` | string | No | Phone number |
| `source` | string | No | Lead source (referral, website, etc.) |
| `notes` | string | No | Free-text notes |
| `expected_value` | string | No | Estimated deal value (parsed as float) |

**Returns**: `ActionResult<{ id: string }>`

**Side Effects**: Creates audit log, revalidates `/leads` and `/overview`.

---

### updateLeadStage(leadId: string, newStage: string)

Moves a lead to a new pipeline stage.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `leadId` | string | Yes | UUID of the lead |
| `newStage` | string | Yes | One of: `new`, `contacted`, `qualified`, `proposal`, `negotiation`, `won`, `lost` |

**Returns**: `ActionResult<{ id: string; stage: string }>`

---

### approvePendingApproval(approvalId: string)

Approves a pending approval request and resumes its linked workflow.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `approvalId` | string | Yes | UUID of the approval |

**Returns**: `ActionResult<{ id: string }>`

**Side Effects**: Sets `decided_by` and `decided_at`. If linked to a workflow run, resumes it (status `paused` -> `running`).

---

### rejectPendingApproval(approvalId: string, reason: string)

Rejects a pending approval request and fails its linked workflow.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `approvalId` | string | Yes | UUID of the approval |
| `reason` | string | Yes | Rejection reason |

**Returns**: `ActionResult<{ id: string }>`

**Side Effects**: If linked to a workflow run, fails it with the rejection reason.

---

### createSubCompany(formData: FormData)

Creates a new sub-company with a default brand.

**Parameters** (via FormData):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Company display name |
| `slug` | string | Yes | URL-safe identifier (`/^[a-z0-9-]+$/`) |
| `organization_id` | string | No | Defaults to `DEFAULT_ORGANIZATION_ID` |
| `industry` | string | No | Primary industry |
| `website` | string | No | Company website URL |

**Returns**: `ActionResult<{ id: string }>`

**Side Effects**: Creates default `brands` row with voice guidelines, colors, and fonts.

---

### triggerSeoAudit(websiteUrl: string, clientId?: string)

Triggers an SEO audit for a given URL (legacy action, prefer `runSeoAudit`).

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `websiteUrl` | string | Yes | Full URL to audit (must be valid URL) |
| `clientId` | string | No | UUID of the client requesting the audit |

**Returns**: `ActionResult<{ message: string }>`

---

### runSeoAudit(url: string, clientId?: string)

Creates a website record (if needed) and a pending audit record.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Full URL to audit (must be valid URL) |
| `clientId` | string | No | UUID of the associated client |

**Returns**: `ActionResult<{ message: string }>`

**Side Effects**: Creates `websites` row if URL is new. Creates `website_audits` row with status `pending`.

---

### generateProposal(leadId: string)

Creates a draft proposal linked to a lead.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `leadId` | string | Yes | UUID of the lead |

**Returns**: `ActionResult<{ id: string }>`

**Side Effects**: Creates `proposals` row with status `draft` and metadata from the lead.

---

### sendProposal(proposalId: string)

Marks a draft proposal as sent.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `proposalId` | string | Yes | UUID of the proposal (must be in `draft` status) |

**Returns**: `ActionResult<{ id: string }>`

---

### acceptProposal(proposalId: string)

Accepts a sent/viewed proposal. Converts the lead to a client and creates a project.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `proposalId` | string | Yes | UUID of the proposal (must be `sent` or `viewed`) |

**Returns**: `ActionResult<{ id: string; project_id?: string }>`

**Side Effects**:
- Creates `clients` row from lead data
- Updates lead to stage `won` with `converted_client_id`
- Creates `projects` row linked to the new client
- Revalidates `/proposals`, `/leads`, `/clients`, `/projects`

---

### startFollowUp(contactId: string, leadId: string)

Creates a follow-up email campaign for a contact.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `contactId` | string | Yes | UUID of the contact |
| `leadId` | string | Yes | UUID of the lead |

**Returns**: `ActionResult<{ campaign_id: string }>`

**Side Effects**: Creates `campaigns` row and first `outreach_events` row.

---

### createCampaign(formData: FormData)

Creates a new outreach campaign.

**Parameters** (via FormData):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Campaign name |
| `campaign_type` | string | No | Type: `email` (default), `sms`, `multi` |
| `organization_id` | string | No | Defaults to `DEFAULT_ORGANIZATION_ID` |

**Returns**: `ActionResult<{ id: string }>`

---

### pauseCampaign(campaignId: string)

Pauses an active campaign.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `campaignId` | string | Yes | UUID of the campaign (must be `active`) |

**Returns**: `ActionResult<{ id: string }>`

---

### resumeCampaign(campaignId: string)

Resumes a paused campaign.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `campaignId` | string | Yes | UUID of the campaign (must be `paused`) |

**Returns**: `ActionResult<{ id: string }>`

---

### createInvoice(formData: FormData)

Creates a draft invoice.

**Parameters** (via FormData):
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `invoice_number` | string | Yes | Unique invoice number |
| `organization_id` | string | No | Defaults to `DEFAULT_ORGANIZATION_ID` |
| `client_id` | string | No | UUID of the client |
| `due_date` | string | No | Due date (ISO format) |
| `line_items` | string | No | JSON array of `{ description, quantity, unit_price, total }` |

**Returns**: `ActionResult<{ id: string }>`

**Side Effects**: Calculates total amount from line items.

---

### updateInvoiceStatus(invoiceId: string, status: string)

Updates an invoice's status.

**Parameters**:
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `invoiceId` | string | Yes | UUID of the invoice |
| `status` | string | Yes | One of: `draft`, `sent`, `paid`, `overdue`, `void` |

**Returns**: `ActionResult<{ id: string; status: string }>`

**Side Effects**: If status is `paid`, sets `paid_at` to current timestamp.
