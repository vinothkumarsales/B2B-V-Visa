export type SideEffectKind =
  | 'email.send'
  | 'crm.sync'
  | 'workdrive.upload'
  | 'browser.automation'
  | 'live.network'
  | 'firecrawl.network';

export type SideEffectPolicy = Partial<Record<SideEffectKind, boolean>>;

const DEFAULT_BLOCKED: SideEffectPolicy = {
  'email.send': false,
  'crm.sync': false,
  'workdrive.upload': false,
  'browser.automation': false,
  'live.network': false,
  'firecrawl.network': false,
};

export function sideEffectAllowed(kind: SideEffectKind): boolean {
  const flag = DEFAULT_BLOCKED[kind];
  if (typeof flag === 'boolean') return flag;
  return false;
}

export function assertNoSideEffects(blockedOn: SideEffectKind[]) {
  for (const kind of blockedOn) {
    if (sideEffectAllowed(kind)) {
      continue;
    }
  }
}

export function isApplicationKitTerminalSafe(status: string, finalStatus?: string): boolean {
  return ['ready_for_review', 'paused', 'completed', 'reviewed', 'revised'].includes(status);
}
