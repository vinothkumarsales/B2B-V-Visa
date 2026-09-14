# VVisa Careers Phase 2C - Signed Payment Webhooks

## Scope

Phase 2C adds a provider-neutral Careers payment webhook boundary. It verifies provider authenticity, normalizes safe event fields, stores sanitized webhook evidence, updates `CareerPaymentIntent` state, and prevents duplicate provider-event processing.

It does not activate subscriptions, activate service requests, start Career-Ops, create workspaces, sync Zoho CRM, upload to WorkDrive, send email, run browser automation, or submit applications.

## Provider-Neutral Verification

- `CareersPaymentWebhookProvider` defines `verifyAndParse(input)`.
- The webhook route reads the raw request body once and passes it to the provider verifier.
- Unknown providers return a controlled unavailable response.
- Fixture is the only implemented provider in this phase.
- Live payment webhooks remain unavailable.

## Fixture HMAC Signing

Fixture webhooks use `x-careers-fixture-signature`.

The signature format is:

```text
sha256=<hmac-sha256-hex-of-raw-body>
```

The secret is read from `CAREERS_FIXTURE_WEBHOOK_SECRET`. `.env.example` includes only an empty placeholder. Fixture signing is for local/test validation only and is not a production payment-provider integration.

## Route

```text
POST /api/careers/payments/webhook/[provider]
```

The route does not require a candidate session. It requires valid provider verification. It rejects unsupported content types and oversized bodies, and it does not log or store raw payloads.

## Event Normalization

Normalized safe fields include provider, provider event ID, event type, provider references, amount, currency, occurrence time, metadata IDs, safe reference, and a payload checksum.

Raw card data, authentication headers, webhook secrets, full provider payloads, and unrestricted financial details are not persisted.

## Idempotency

`CareerPaymentWebhookEvent` has a unique key on `provider + providerEventId`. Duplicate events return a successful acknowledgement and do not update payment intent state again.

## Payment Intent Matching

Matching order:

1. verified metadata `paymentIntentId`;
2. provider checkout ID;
3. provider payment intent ID;
4. provider payment ID already linked to a payment intent.

Candidate and service request IDs from the webhook are stored only as safe metadata context and are not trusted for ownership.

## State Transitions

Supported mappings use the existing Phase 2A enum:

- `checkout_created` -> `checkout_created`
- `payment_authorised` -> `payment_pending`
- `payment_captured` -> `paid`
- `payment_failed` -> `failed`
- `payment_cancelled` -> `cancelled`
- `payment_expired` -> `expired`

Refund and dispute events are stored as unsupported/rejected in this phase because there are no corresponding payment intent statuses yet.

## Amount And Currency Verification

When webhook amount or currency is present, the processor compares it against the payment intent and the pricing snapshot reference. Mismatches are recorded as rejected events and do not mark payment as paid.

## Audit

Safe audit events are written for duplicate, rejected, mismatch, transition-blocked, and state-updated webhook outcomes. Metadata excludes raw payloads, secrets, headers, and financial credentials.

## Admin Visibility

The Careers admin console shows read-only webhook rows behind existing admin authentication and `CAREERS_INTERNAL_CONSOLE_ENABLED`. It displays provider, event type, payment intent, processing status, signature verification, received time, safe failure code, and duplicate status.

## Feature Flags

All remain disabled by default:

- `CAREERS_PAYMENT_WEBHOOKS_ENABLED=false`
- `CAREERS_FIXTURE_WEBHOOKS_ENABLED=false`
- `CAREERS_FIXTURE_WEBHOOK_SECRET=`
- `CAREERS_LIVE_PAYMENTS_ENABLED=false`

## Known Limitations

- Fixture is the only webhook provider.
- No real Razorpay or Stripe verification was added.
- No subscription or service activation occurs.
- Refund and dispute lifecycle statuses are not implemented.
- No raw provider payload is available for forensic replay by design.

## Validation Results

- Disposable PostgreSQL 16.14 migration validation passed.
- `npx prisma migrate deploy` applied `20260708123000_careers_phase2c_signed_payment_webhooks`.
- `npx prisma migrate status` reported the database schema is up to date.
- `npx prisma format` passed; unrelated schema formatting churn was not kept in the patch.
- `npx prisma validate` passed.
- `npx prisma generate` passed.
- `npm run typecheck` passed.
- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.

## Rollback

Set Careers webhook flags to `false`. If committed, run `git revert <commit>`.

## Phase 2D Boundary

Phase 2D is subscription and service activation. It may consume verified paid payment intents and activate subscription/service records exactly once. It must still not run Career-Ops directly.
