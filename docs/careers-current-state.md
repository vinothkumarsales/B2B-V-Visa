# VVisa Careers Current State

## Completed

- Phase 1: feature-flagged Careers SaaS foundation.
- Phase 2A: package and payment domain.
- Phase 2B: provider-neutral checkout abstraction with fixture provider.
- Phase 2C: signed payment webhook verification and safe event persistence.
- Phase 2D: subscription/service activation from verified paid payment intents, with a pending durable activation handoff.

## Current Boundary

The system can collect onboarding information, create package-backed payment intents, create fixture checkout links, verify fixture webhooks, mark payment intents as paid, and activate subscription/service records through an admin-only activation endpoint when all activation flags are enabled.

Career-Ops execution remains disabled. Workspace creation, live discovery, application-kit generation, browser-assisted applications, CRM/WorkDrive writes, email sending, and auto-submission are not implemented.

## Phase 2D State

Activation creates exactly one active `CareerSubscription`, updates the matching `CareerServiceRequest`, and creates one `CareerActivationHandoff` in `pending` state. The handoff is durable but not consumed.
