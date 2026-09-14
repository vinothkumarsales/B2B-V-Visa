# VVisa Careers Phase 2D - Subscription And Service Activation

## Scope

Phase 2D consumes a verified captured Careers payment intent and activates the matching `CareerSubscription` and `CareerServiceRequest` exactly once. It also creates one durable `CareerActivationHandoff` record in `pending` state for the later workspace-activation phase.

It does not run Career-Ops, create candidate workspaces, start discovery, send emails, update Zoho CRM, upload to WorkDrive, run browser automation, or submit applications.

## Activation Gate

Activation is available only when all required flags are enabled:

- `CAREERS_SAAS_ENABLED`
- `CAREERS_PACKAGES_ENABLED`
- `CAREERS_PAYMENTS_ENABLED`
- `CAREERS_SERVICE_ACTIVATION_ENABLED`
- `CAREERS_SUBSCRIPTION_ACTIVATION_ENABLED`
- `CAREERS_ACTIVATION_HANDOFF_ENABLED`

All new Phase 2D flags default to `false`.

## API

```text
POST /api/admin/careers/activations
```

The route is internal/admin-only through existing admin authentication and permission checks. It accepts `paymentIntentId` and optional `correlationId`. It does not accept candidate, service, amount, package, or status values from the browser.

## Validation Rules

Activation requires:

- payment intent exists;
- payment intent status is `paid`;
- payment intent has no unresolved safe failure metadata;
- payment intent candidate and service request match;
- service request is not already active without a handoff;
- no conflicting active subscription exists;
- pricing snapshot exists in the payment intent;
- amount, currency, and package code match the immutable pricing snapshot;
- all activation flags are enabled.

## State Changes

On first successful activation:

- `CareerSubscription` is created or updated to `active`;
- subscription stores `paymentIntentId`, `packageName`, amount, currency, `pricingSnapshotId`, `startedAt`, and `activatedAt`;
- `CareerServiceRequest` is marked `payment_verified`, `paid`, `service_active`;
- candidate status becomes `subscription_active`;
- `CareerActivationHandoff` is created with `status=pending`.

No handoff consumer is implemented in this phase.

## Idempotency

The activation idempotency key defaults to:

```text
career-activation:<paymentIntentId>
```

`CareerSubscription.paymentIntentId` is unique and `CareerActivationHandoff.idempotencyKey` is unique. Repeated or concurrent activation returns the existing subscription and handoff without duplicating activation.

## Visibility

The candidate dashboard shows activation status derived from payment, subscription, service request, and handoff state.

The Careers admin console shows read-only subscriptions and activation handoffs behind the existing internal console flag and admin authentication.

## Audit

Safe audit events are written for:

- `career_subscription_activated`
- `career_service_request_activated`
- `career_activation_handoff_created`
- `career_activation_reused`

Audit metadata contains only internal IDs and status context.

## Database Changes

- Adds `CareerActivationHandoff`.
- Adds `paymentIntentId`, `packageName`, `activatedAt`, and `pricingSnapshotId` to `CareerSubscription`.
- Adds relations from payment intent, candidate, service request, and subscription to handoff records.

## Known Limitations

- Package duration is not modelled yet, so `currentPeriodEnd` remains nullable.
- Handoff processing is not implemented.
- No Career-Ops, workspace, CRM, WorkDrive, email, browser automation, or application execution starts here.

## Validation Results

- Disposable PostgreSQL 16.14 migration validation passed.
- `npx prisma migrate deploy` applied `20260708133000_careers_phase2d_subscription_service_activation`.
- `npx prisma migrate status` reported the database schema is up to date.
- `npx prisma format` passed; unrelated schema formatting churn was not kept in the patch.
- `npx prisma validate` passed.
- `npx prisma generate` passed.
- `npm run typecheck` passed.
- `npm run test` passed.
- `npm run lint` passed.
- `npm run build` passed.

## Rollback

Set Phase 2D flags to `false`. If committed, run:

```bash
git revert <phase-2d-commit>
```

## Phase 2E Boundary

Phase 2E may consume pending activation handoffs and prepare the candidate workspace. It must still not directly run Career-Ops unless that later phase explicitly defines a separate execution boundary.
