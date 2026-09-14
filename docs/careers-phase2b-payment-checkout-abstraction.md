# VVisa Careers Phase 2B - Payment Checkout Abstraction

## Scope

Phase 2B adds a provider-neutral Careers checkout creation boundary and deterministic fixture provider. It does not confirm, capture, refund, activate subscriptions, activate Career-Ops, process webhooks, sync CRM, upload to WorkDrive, send email, run browser automation, or submit applications.

## Provider Abstraction

- `CareersPaymentProvider` defines `createCheckout(input)`.
- `FixtureCareersPaymentProvider` is the only active provider in this phase.
- Razorpay and Stripe were not added because this repository does not currently contain approved reusable adapters for them.
- Non-fixture provider configuration returns a controlled provider-unavailable response.

## API

- `POST /api/careers/payments/checkout`
- Requires authenticated session.
- Accepts `serviceRequestId`, `packageCode`, and `currency`.
- Does not accept amount from the browser.

## Pricing Protection

Checkout creation loads the active persisted package and active persisted price server-side, creates a pricing snapshot, stores amount/currency on `CareerPaymentIntent`, and sends that stored amount to the provider.

## Idempotency

Checkout attempts are grouped by candidate, service request, package code, and currency. A non-expired `checkout_created` intent is reused. Draft/awaiting checkout intents are reused only when amount and currency still match. Expired, failed, or cancelled attempts may create a new attempt number.

## Security

- Authenticated session is required.
- Candidate ownership is enforced through the service request candidate relation.
- Active subscriptions block checkout creation.
- Redirect URLs are derived from configured app origin.
- Provider secrets and raw provider payloads are not returned to the browser.
- Audit events are written for created, reused, and failed checkout attempts.

## Feature Flags

All remain disabled by default:

- `CAREERS_PAYMENTS_ENABLED`
- `CAREERS_CHECKOUT_ENABLED`
- `CAREERS_PAYMENT_PROVIDER=fixture`
- `CAREERS_PAYMENT_MODE=fixture`
- `CAREERS_LIVE_PAYMENTS_ENABLED=false`

## Database Changes

Added checkout/provider reference fields to `CareerPaymentIntent`, including provider checkout ID, provider payment intent ID, checkout URL, expiry, safe failure fields, and attempt grouping metadata.

## Known Limitations

- Fixture checkout is the only available provider.
- No payment is confirmed or captured.
- No subscription is activated.
- No webhook endpoint or signature verification is implemented.
- No real provider sandbox call is made.

## Validation Results

- Disposable PostgreSQL 16.14 migration validation passed.
- `npx prisma migrate deploy` applied `20260708113000_careers_phase2b_checkout_abstraction`.
- `npx prisma migrate status` reported the database schema is up to date.
- `npx prisma validate` passed.
- `npx prisma generate` passed.
- `npm run typecheck` passed.
- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.

## Rollback

Set all `CAREERS_*` flags to `false`. If committed, run `git revert <commit>`.

## Phase 2C Boundary

Phase 2C is signed payment webhook verification only. It may verify provider event authenticity and update payment state, but it must still not activate Career-Ops or create an active subscription.
