# Trigger.dev Workflows — North Bridge Digital

## Setup Instructions

### 1. Create Trigger.dev Account
Go to [trigger.dev](https://trigger.dev) and sign up (free tier available).

### 2. Create Project
- Project name: `venture-os`
- Get your API key from the dashboard

### 3. Set Environment Variables
```bash
TRIGGER_API_KEY=tr_dev_your-key
TRIGGER_API_URL=https://api.trigger.dev
```

### 4. Deploy Workflows
```bash
cd apps/workflows
npx trigger.dev@latest deploy
```

## Available Workflows

| Job | Trigger | What It Does |
|-----|---------|-------------|
| `lead-intake` | New lead in Supabase | Score → assign agent → qualify → follow-up |
| `seo-audit` | Manual/webhook | Firecrawl crawl → analyze → findings → report |
| `proposal-generation` | Lead qualified | GPT generates structured proposal |
| `follow-up-sequence` | Lead needs nurture | Consent check → send email → schedule next |
| `monthly-report` | Cron monthly | Aggregate KPIs → HTML report |
| `launch-company` | Manual | Create sub-company + brand + KPIs + approval gate |

## Local Development
```bash
cd apps/workflows
npx trigger.dev@latest dev
```
