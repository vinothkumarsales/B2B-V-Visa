import { boolEnv, loadLocalEnv, printProbe } from './shared.ts';

loadLocalEnv();

const probeName = process.argv[2] || 'write-probe';
const writeEnabled = boolEnv('CRM_WRITE_ENABLED') && boolEnv('ALLOW_LIVE_CRM_WRITE_PROBES');

printProbe(probeName, {
  configured: false,
  write_probe_enabled: writeEnabled,
  write_probe_passed: false,
  read_back_verified: false,
  cleanup_verified: false,
  note: writeEnabled
    ? 'write probe implementation requires explicit test-record mapping before mutation'
    : 'write probe disabled; set CRM_WRITE_ENABLED=true and ALLOW_LIVE_CRM_WRITE_PROBES=true only after approval',
});
