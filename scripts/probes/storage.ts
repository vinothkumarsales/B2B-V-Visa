import { loadLocalEnv, printProbe, probeStorageRoot } from './shared.ts';

loadLocalEnv();

const result = probeStorageRoot();
printProbe('storage', {
  configured: true,
  provider: process.env.STORAGE_PROVIDER || 'local',
  ...result,
});
