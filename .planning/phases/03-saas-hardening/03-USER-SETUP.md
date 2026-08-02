# Phase 3: SaaS Hardening — User Setup

> **Status: Incomplete** — only required for staging/production. Local dev and E2E run entirely in **mock mode** (`BILLING_PROVIDER=mock`, the default) with zero Stripe account needed.

## Stripe (billing)

Required only when `BILLING_PROVIDER=stripe` is set for staging/production. Skip everything below for local development.

### Environment Variables

| Variable                | Source                                                                             | Required                            |
| ----------------------- | ---------------------------------------------------------------------------------- | ----------------------------------- |
| `STRIPE_SECRET_KEY`     | Stripe Dashboard → Developers → API keys (`sk_live_...` / `sk_test_...`)           | Yes (stripe mode)                   |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → endpoint → signing secret (`whsec_...`) | Yes (stripe mode)                   |
| `STRIPE_PRICE_PRO`      | Stripe Dashboard → Products → Pro plan → price id (`price_...`)                    | Yes (stripe mode)                   |
| `BILLING_PROVIDER`      | —                                                                                  | `stripe` or `mock` (default `mock`) |

### Dashboard Configuration

1. Create a webhook endpoint at `https://<api-host>/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Location: Stripe Dashboard → Developers → Webhooks
2. Copy the endpoint's signing secret into `STRIPE_WEBHOOK_SECRET`
3. Create a Pro plan (price `$12`/month, recurring) and copy its price id into `STRIPE_PRICE_PRO`

### Verification

```bash
# With BILLING_PROVIDER=stripe set and keys present:
bun --filter api test
# Webhook rejects unverifiable payloads:
curl -si "http://localhost:3001/api/stripe/webhook" -X POST \
  -H "content-type: application/json" -d '{}'   # → 400 (no signature)
```

## AI (staging/production)

Required when `AI_PROVIDER` is set to a real provider (staging/production). Dev/E2E use `AI_PROVIDER=mock` (default).

| Variable            | Source                | Required                          |
| ------------------- | --------------------- | --------------------------------- |
| `AI_PROVIDER`       | —                     | `openai` \| `anthropic` \| `mock` |
| `OPENAI_API_KEY`    | platform.openai.com   | Yes when `AI_PROVIDER=openai`     |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Yes when `AI_PROVIDER=anthropic`  |

## Deployment env (03-08)

| Variable           | Source                                                   | Required                                                            |
| ------------------ | -------------------------------------------------------- | ------------------------------------------------------------------- |
| `VITE_APP_ENV`     | Set per environment at build time (web Docker build arg) | `staging` to render the env badge; `production` (default) for prod  |
| `BILLING_PROVIDER` | —                                                        | **Production must set `stripe` explicitly** — mock is dev/test only |

The full environment variable table for all environments lives in [DEPLOYMENT.md](../../../DEPLOYMENT.md) (repo root). No keys are committed.

## Notes

- Mock mode (`BILLING_PROVIDER=mock`, default) needs no Stripe account — checkout returns `http://localhost:5173/mock-checkout?orgId=...&tier=pro`, portal returns `mock-portal` URLs.
- The 03-07 E2E suite runs entirely in mock mode.
