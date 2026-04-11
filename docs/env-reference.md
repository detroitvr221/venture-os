# North Bridge Digital Environment Variables Reference

All environment variables used by North Bridge Digital, grouped by service. Copy `.env.example` and fill in your values.

## Supabase

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project API URL | `https://abcdefg.supabase.co` | Supabase Dashboard > Project Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key (safe for browser) | `eyJhbGciOi...` | Supabase Dashboard > Project Settings > API > anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (bypasses RLS -- keep secret) | `eyJhbGciOi...` | Supabase Dashboard > Project Settings > API > service_role secret |

## OpenAI

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `OPENAI_API_KEY` | Yes | OpenAI API key for agent model calls | `sk-proj-abc123...` | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |

## Stripe

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (test or live) | `sk_test_abc123...` | Stripe Dashboard > Developers > API Keys |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret | `whsec_abc123...` | Stripe Dashboard > Developers > Webhooks > Signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key (safe for browser) | `pk_test_abc123...` | Stripe Dashboard > Developers > API Keys |

## Resend (Email)

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `RESEND_API_KEY` | Yes | Resend API key for sending emails | `re_abc123...` | [resend.com/api-keys](https://resend.com/api-keys) |

## Twilio (SMS/Voice)

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `TWILIO_ACCOUNT_SID` | Optional | Twilio account SID | `AC1234567890abcdef` | Twilio Console > Account Info |
| `TWILIO_AUTH_TOKEN` | Optional | Twilio auth token | `your_auth_token` | Twilio Console > Account Info |
| `TWILIO_PHONE_NUMBER` | Optional | Twilio phone number for outbound SMS/calls | `+15551234567` | Twilio Console > Phone Numbers |

## Firecrawl (Web Scraping)

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `FIRECRAWL_API_KEY` | Yes | Firecrawl API key for web crawling and extraction | `fc-abc123...` | [firecrawl.dev/app/api-keys](https://firecrawl.dev/app/api-keys) |

## Mem0 (Memory)

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `MEM0_API_KEY` | Yes | Mem0 API key for agent memory operations | `m0-abc123...` | [app.mem0.ai/dashboard](https://app.mem0.ai/dashboard) > API Keys |

## OpenClaw

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `OPENCLAW_GATEWAY_URL` | Yes | URL of the OpenClaw gateway | `https://claw.thenorthbridgemi.com` | Your gateway deployment URL |
| `OPENCLAW_API_KEY` | Yes | API key for authenticating with the OpenClaw gateway | `oc-abc123...` | Generated during OpenClaw setup |
| `OPENCLAW_GATEWAY_TOKEN` | Yes | Token for gateway-to-North Bridge Digital communication | `your-gateway-token` | Generated during setup, shared with gateway config |
| `OPENCLAW_HOOKS_TOKEN` | Yes | Token for webhook authentication | `your-hooks-token` | Generated during setup, set as `OPENCLAW_WEBHOOK_SECRET` |
| `OPENCLAW_WEBHOOK_SECRET` | Yes | Validates incoming webhook requests from OpenClaw | `your-webhook-secret` | Same value as `OPENCLAW_HOOKS_TOKEN` |

## Trigger.dev

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `TRIGGER_API_KEY` | Yes | Trigger.dev API key for workflow execution | `tr_dev_abc123...` | [cloud.trigger.dev](https://cloud.trigger.dev) > Project Settings > API Keys |
| `TRIGGER_API_URL` | Optional | Trigger.dev API URL (defaults to cloud) | `https://api.trigger.dev` | Only change for self-hosted Trigger.dev |

## App Configuration

| Variable | Required | Description | Example | Where to Get |
|----------|----------|-------------|---------|--------------|
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the North Bridge Digital dashboard | `https://app.thenorthbridgemi.com` | Your deployment domain |
| `NODE_ENV` | Yes | Runtime environment | `development` or `production` | Set per environment |
| `DEFAULT_ORGANIZATION_ID` | Optional | Default org ID for server actions when none is provided | `00000000-0000-0000-0000-000000000001` | Your organization's UUID from the `organizations` table |

## Security Notes

- **Never commit `.env` to git.** The `.gitignore` already excludes it.
- **Service role key** (`SUPABASE_SERVICE_ROLE_KEY`) bypasses all RLS. Only use server-side.
- **Stripe live keys** (`sk_live_*`) should only exist on production servers. Use `sk_test_*` everywhere else.
- **Rotate keys** if you suspect any exposure. Update all deployed instances immediately.
- **`NEXT_PUBLIC_*` variables** are embedded in the client bundle at build time. Only put non-secret values here.
