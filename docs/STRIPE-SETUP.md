# Stripe Setup — North Bridge Digital

## 1. Create Stripe Account
Go to [stripe.com](https://stripe.com) and sign up.

## 2. Get API Keys
Dashboard → Developers → API Keys
- `STRIPE_SECRET_KEY` (starts with `sk_test_` or `sk_live_`)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (starts with `pk_test_` or `pk_live_`)

## 3. Set Up Webhook
Dashboard → Developers → Webhooks → Add Endpoint
- URL: `https://thenorthbridgemi.com/api/stripe/webhook`
- Events: `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- Get `STRIPE_WEBHOOK_SECRET` (starts with `whsec_`)

## 4. Add to Dashboard Docker Env
Add these to the venture-os Docker Compose:
```
- STRIPE_SECRET_KEY=sk_test_your-key
- STRIPE_WEBHOOK_SECRET=whsec_your-secret
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-key
```

## 5. Create Products
In Stripe Dashboard, create:

| Product | Price | Billing |
|---------|-------|---------|
| Launch Package | $2,500 | One-time |
| Growth Package | $5,000/mo | Monthly |
| Scale Package | $10,000/mo | Monthly |
| SEO Audit | $500 | One-time |
| Website Audit | $250 | One-time |

## 6. Enable Stripe Connect (Future)
For sub-company revenue splitting:
Dashboard → Connect → Get started
This enables multi-tenant payouts when sub-companies generate revenue.

## Code Already Built
- `packages/services/src/billing.ts` — Subscription management, usage metering, invoicing
- `apps/web/app/(dashboard)/billing/` — Billing dashboard, invoices, usage meters
- `apps/workflows/src/jobs/billing-sync.ts` — (Planned) Stripe webhook processing

## Status
- [ ] Create Stripe account
- [ ] Get API keys
- [ ] Add to Docker env
- [ ] Create products
- [ ] Set up webhook endpoint
- [ ] Test in test mode
- [ ] Switch to live mode
