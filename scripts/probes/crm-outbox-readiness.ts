import { boolEnv, loadLocalEnv, printProbe, requiredEnvPresent } from './shared.ts';

loadLocalEnv();

const crmWriteEnabled = boolEnv('CRM_WRITE_ENABLED');
const attachmentSyncEnabled = boolEnv('CRM_ATTACHMENT_SYNC_ENABLED');
const storageProvider = process.env.STORAGE_PROVIDER || 'local';
const storageRoot = process.env.STORAGE_PRIVATE_ROOT || 'upload/private';
const storageConfigured = storageProvider === 'local' && Boolean(storageRoot);
const crmConfigured = Boolean(
  process.env.ZOHO_CRM_CLIENT_ID &&
    process.env.ZOHO_CRM_CLIENT_SECRET &&
    process.env.ZOHO_CRM_REFRESH_TOKEN,
);

printProbe('crm-outbox-readiness', {
  configured: crmConfigured && storageConfigured,
  crm_write_enabled: crmWriteEnabled,
  crm_attachment_sync_enabled: attachmentSyncEnabled,
  attachment_worker_ready: crmConfigured && storageConfigured && crmWriteEnabled && attachmentSyncEnabled,
  storage_provider: storageProvider,
  storage_root_configured: Boolean(storageRoot),
  required_keys: [
    ...requiredEnvPresent([
    'ZOHO_CRM_CLIENT_ID',
    'ZOHO_CRM_CLIENT_SECRET',
    'ZOHO_CRM_REFRESH_TOKEN',
    ]),
    `STORAGE_PRIVATE_ROOT:${storageRoot ? 'configured' : 'missing'}`,
  ],
  note:
    crmWriteEnabled && attachmentSyncEnabled
      ? 'attachment outbox worker can process queued events in server runtime'
      : 'enable CRM_WRITE_ENABLED and CRM_ATTACHMENT_SYNC_ENABLED before processing queued CRM attachment events',
});
