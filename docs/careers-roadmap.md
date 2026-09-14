# VVisa Careers Roadmap

## Closed Phases

- Phase 1: Careers public, onboarding, dashboard, admin shell, private resume storage, and feature flags.
- Phase 2A: configurable packages and payment/subscription domain.
- Phase 2B: payment checkout abstraction with fixture provider.
- Phase 2C: signed payment webhook verification.
- Phase 2D: subscription and service activation.

## Next Boundary

Phase 2E should consume pending `CareerActivationHandoff` rows and prepare a candidate workspace exactly once.

Phase 2E must not directly run Career-Ops unless a later execution phase explicitly enables it. It should not add CRM, WorkDrive, email, browser automation, or auto-submission unless separately scoped.
