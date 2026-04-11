# Runbook: SEO Audit

Run a full SEO audit on any website, review findings, and create an action plan.

## Prerequisites

- Firecrawl API key configured (`FIRECRAWL_API_KEY`)
- OpenClaw gateway running with SEO agent active
- Target website is publicly accessible

## Steps

### 1. Enter URL in SEO Audits Page

Navigate to **SEO > New Audit** and enter the target URL.

Server action: `runSeoAudit(url, clientId?)` does the following:
1. Creates or finds a `websites` row for the URL
2. Creates a `website_audits` row with status `pending` and type `seo`
3. Logs the action in `audit_logs`

### 2. Trigger Audit Workflow

The `seo-audit` Trigger.dev workflow fires:
1. **Crawl phase**: Firecrawl scrapes the target site (homepage + linked pages)
2. **Analysis phase**: SEO agent analyzes crawl results against ranking factors:
   - Title tags and meta descriptions
   - Header hierarchy (H1-H6)
   - Image alt text coverage
   - Internal/external link structure
   - Page load indicators
   - Mobile-friendliness signals
   - Schema markup presence
   - Canonical URLs and redirects
3. **Scoring phase**: Generates an overall SEO score (0-100) and per-category scores
4. **Findings phase**: Creates `seo_findings` rows for each issue found, with severity levels:
   - `critical`: Blocks indexing or causes major ranking loss
   - `high`: Significant ranking impact
   - `medium`: Moderate impact, should fix
   - `low`: Minor improvements

### 3. Review Findings by Severity

On the SEO audit detail page (`/seo/[id]`):
- **Summary card**: Overall score, findings count by severity
- **Findings list**: Grouped by severity, each with:
  - Description of the issue
  - Affected URL(s)
  - Recommended fix
  - Impact estimate

Priority order for review:
1. Critical findings (fix immediately)
2. High findings (fix within 1 week)
3. Medium findings (fix within 1 month)
4. Low findings (backlog)

### 4. Create Action Plan

For each finding you want to address:
1. The SEO agent generates specific remediation steps
2. Steps are stored as tasks linked to the audit
3. Tasks can be assigned to the Developer agent (technical SEO), Web Presence agent (content), or a human

### 5. Assign to Agents

From the audit detail page:
- **Technical fixes** (broken links, missing tags, schema markup): Assign to Developer agent
- **Content improvements** (thin content, missing descriptions): Assign to Web Presence agent
- **Strategic changes** (keyword targeting, content gaps): Assign to SEO agent for planning

Each assignment creates an agent thread and triggers the appropriate OpenClaw workflow.

### 6. Schedule Re-audit

After fixes are deployed:
1. Go to the website's audit history
2. Click **Schedule Re-audit**
3. Choose timing: immediate, 1 week, or 1 month
4. The system creates a new audit with a link to the previous one for comparison

Re-audit results include a delta view showing improvements and regressions.

## Common Issues

**Crawl fails or returns no data**:
- Verify the URL is publicly accessible (not behind auth)
- Check if the site blocks bots (robots.txt, Cloudflare)
- Verify `FIRECRAWL_API_KEY` is valid and has remaining credits

**Audit stuck in "pending"**:
- Check the `seo-audit` workflow status in Trigger.dev dashboard
- Check OpenClaw gateway health: `curl https://claw.thenorthbridgemi.com/health`
- Look at Supabase logs for insert errors on `website_audits`

**Low score but site looks fine**:
- The audit checks technical SEO, not visual quality
- Common hidden issues: missing alt text, no schema markup, poor internal linking
- Run a comparison audit against a competitor for context
