# Production Integration Readiness

## Current Phase

Phase 1 is prepared: Zoho CRM authentication and read-only module validation.

Writes remain disabled by default:

```env
CRM_SYNC_ENABLED=false
CRM_WRITE_ENABLED=false
CRM_ATTACHMENT_SYNC_ENABLED=false
CRM_ABANDONED_LEAD_ENABLED=false
CRM_PAYMENT_CONVERSION_ENABLED=false
```

## Required Manual Secrets

Do not commit these values. Add them through local `.env.local` or Vercel environment settings only after approval.

### Zoho CRM

```env
ZOHO_CRM_CLIENT_ID=
ZOHO_CRM_CLIENT_SECRET=
ZOHO_CRM_REFRESH_TOKEN=
ZOHO_CRM_ACCOUNTS_URL=https://accounts.zoho.in
ZOHO_CRM_API_BASE_URL=https://www.zohoapis.in
```

Existing local mapping verified in read-only probes:

```text
C:\vvisas-ai\.env ZOHO_CLIENT_ID -> ZOHO_CRM_CLIENT_ID
C:\vvisas-ai\.env ZOHO_CLIENT_SECRET -> ZOHO_CRM_CLIENT_SECRET
C:\vvisas-ai\.env ZOHO_REFRESH_TOKEN -> ZOHO_CRM_REFRESH_TOKEN
```

### Zoho Payments

Still required:

```env
ZOHO_PAYMENTS_CLIENT_ID=
ZOHO_PAYMENTS_CLIENT_SECRET=
ZOHO_PAYMENTS_REFRESH_TOKEN=
ZOHO_PAYMENTS_ACCOUNT_ID=
ZOHO_PAYMENTS_ORG_ID=
ZOHO_PAYMENTS_API_BASE_URL=
ZOHO_PAYMENTS_WEBHOOK_SECRET=
```

### Digio

Still required:

```env
DIGIO_CLIENT_ID=
DIGIO_CLIENT_SECRET=
DIGIO_BASE_URL=https://api.digio.in
DIGIO_ENVIRONMENT=sandbox
```

### Private Storage

Local development is ready:

```env
STORAGE_PROVIDER=local
STORAGE_PRIVATE_ROOT=upload/private
```

Production must use durable private storage before enabling attachment sync. Do not use Vercel local filesystem for persistent documents.

## Probe Commands

Read-only:

```bash
npm run probe:zoho-auth
npm run probe:zoho-modules
npm run probe:zoho-fields
npm run probe:travel-agent-read
npm run probe:storage
npm run probe:digio
npm run probe:zoho-payments
npm run probe:integrations
```

Write probes are intentionally disabled until explicitly approved:

```bash
npm run probe:travel-agent-upsert
npm run probe:visa-lead
npm run probe:lead-conversion
npm run probe:crm-attachment
```

To even prepare a live write probe, both flags must be explicitly set:

```env
CRM_WRITE_ENABLED=true
ALLOW_LIVE_CRM_WRITE_PROBES=true
```

## Latest Read-only Zoho Evidence

Using local credentials mapped in process memory only:

```text
Zoho auth: credentials_valid=true
Travel_Agents module: available
Leads module: available
Contacts module: available
Travel Agent read probe: passed
```

Field metadata probe:

```text
confirmed_field_count=8
checked_field_count=14
field_mapping_valid=false
```

Unresolved required custom fields remain blockers for write enablement. They are reported by:

```bash
npm run probe:zoho-fields
```

## Vercel Secret Setup

Only these two public/non-secret variables were already present in Vercel during inspection:

```text
APP_MODE
NEXT_PUBLIC_APP_URL
```

Adding Zoho/Digio/Payments secrets to Vercel requires explicit owner approval because it sends local credentials to an external provider.

Recommended Vercel phases:

1. Add Zoho CRM read credentials only.
2. Deploy with `CRM_SYNC_ENABLED=false` and `CRM_WRITE_ENABLED=false`.
3. Run read-only probes against production environment.
4. Enable `CRM_SYNC_ENABLED=true` only after probe evidence.
5. Keep `CRM_WRITE_ENABLED=false` until field mapping blockers are resolved.

## Google Signup / Mail OTP

This repo currently has email/password server sessions. Google signup and mail OTP verification are not wired in this slice. They should be implemented as a separate auth milestone after confirming the email provider and OAuth project credentials.
