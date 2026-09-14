# VVisa Careers Phase 1 Foundation

## Scope

Phase 1 creates the standalone Careers SaaS foundation inside the existing VVisa B2B portal. It intentionally stops before payment capture, Career-Ops discovery, application-kit generation, mailbox automation, browser execution, calendar event creation, meeting links, or employer response sync.

## Architecture

- Public entry: `/careers`
- Authenticated onboarding: `/careers/onboarding`
- Candidate dashboard: `/careers/dashboard`
- Internal review shell: `/admin/careers`
- Write APIs: `POST /api/careers/onboarding`, `POST /api/careers/resume`
- Persistence: Prisma models `CareerCandidate`, `CareerSearchPreference`, `CareerResume`, `CareerServiceRequest`, and `CareerStatusEvent`
- Storage: existing private document storage, scoped under a careers storage key
- Guardrails: all mutations are feature-flagged off by default

## Feature Flags

- `CAREERS_SAAS_ENABLED`
- `CAREERS_ONBOARDING_ENABLED`
- `CAREERS_RESUME_UPLOAD_ENABLED`
- `CAREERS_INTERNAL_CONSOLE_ENABLED`
- Future integration toggles are present but disabled: calendar providers, meeting providers, calendar event creation, reminders, employer response sync, and interview detection.

## Rollback

Set all `CAREERS_*` flags to `false`. Routes remain present, but writes are blocked and internal candidate listing is hidden.

## Phase 2 Handoff

Phase 2 should add payment activation and CRM handoff only after product pricing, package entitlements, refund/cancellation policy, and Zoho field mappings are confirmed. Career-Ops execution should remain disabled until a human-reviewed queue and no-auto-submit policy are implemented.
