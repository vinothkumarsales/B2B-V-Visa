# VVisa Careers Phase 2A - Packages And Payment Domain

## Scope

Phase 2A adds configurable Careers packages and payment/subscription domain records. It does not create checkout sessions, verify webhooks, capture payments, activate Career-Ops, sync CRM, send email, run browser automation, or submit applications.

## Completed Scope

- Persisted Careers package catalogue and package prices.
- Seeded default Europe Assist, Pro, and Premium package configuration in the migration.
- Added supported currencies: `INR`, `EUR`, and `USD`.
- Added pricing snapshot storage for selected package pricing.
- Added draft payment intent and draft subscription records.
- Added payment intent and subscription state-machine helpers.
- Added package-backed candidate package selection when `CAREERS_PACKAGES_ENABLED=true`.
- Added read-only admin package visibility in the Careers admin console.

## Files Added

- `src/server/careers/packages.ts`
- `src/server/careers/payment-domain.ts`
- `tests/careers-payment-domain.test.ts`
- `prisma/migrations/20260708103000_careers_phase2a_packages_payment_domain/migration.sql`

## Files Modified

- `.env.example`
- `prisma/schema.prisma`
- `src/app/admin/careers/page.tsx`
- `src/app/careers/page.tsx`
- `src/app/careers/dashboard/page.tsx`
- `src/app/careers/onboarding/page.tsx`
- `src/components/careers/CareerOnboardingForm.tsx`
- `src/lib/env.ts`
- `src/server/careers/feature-flags.ts`
- `src/server/careers/onboarding.ts`
- `tests/careers-feature-flags.test.ts`

## Database Changes

- Added package, price, pricing snapshot, payment intent, and subscription tables.
- Added package/payment/subscription enums.
- Added optional package link and payment/activation indexes to `CareerServiceRequest`.
- Migration is additive and seeds package configuration only.

## Feature Flags

All remain disabled by default:

- `CAREERS_PACKAGES_ENABLED`
- `CAREERS_PAYMENTS_ENABLED`
- `CAREERS_LIVE_DISCOVERY_ENABLED`
- `CAREERS_APPLICATION_KIT_ENABLED`
- `CAREERS_BROWSER_EXECUTION_ENABLED`
- `CAREERS_AUTO_SUBMIT_ENABLED`
- `CAREERS_EMAIL_DRAFTS_ENABLED`
- `CAREERS_EMAIL_SEND_ENABLED`
- `CAREERS_REPLY_SYNC_ENABLED`
- `CAREERS_CRM_SYNC_ENABLED`
- `CAREERS_WORKDRIVE_UPLOAD_ENABLED`

Existing Phase 1 flags remain disabled by default.

## Known Limitations

- No checkout URL is created.
- No payment provider API is called.
- No webhook endpoint is added.
- Draft payment/subscription rows are configuration records only.
- Package writes are not exposed in the admin UI.

## Validation Results

- `npx prisma format` passed; unrelated schema formatting churn was not kept in the patch.
- `npx prisma validate` passed with a shell-local disposable database URL.
- `npx prisma generate` passed.
- `npx prisma migrate deploy` passed against disposable PostgreSQL 16.14.
- `npx prisma migrate status` passed with `Database schema is up to date!`.
- `npm run typecheck` passed.
- `npm run test` passed, 32/32.
- `npm run lint` passed.
- `npm run build` passed.

## Migration Evidence

- Database type/version: PostgreSQL 16.14 in Docker.
- Database classification: disposable validation database.
- Production database used: no.
- Applied migration: `20260708103000_careers_phase2a_packages_payment_domain`.
- Secrets committed or staged: no.

## Rollback

Set all `CAREERS_*` flags to `false`. If the patch has been committed, use `git revert <commit>`.

## Next Phase Boundary

Phase 2B should add payment checkout abstraction only. It should not add webhook verification, subscription activation, Career-Ops activation, CRM sync, or live execution.
