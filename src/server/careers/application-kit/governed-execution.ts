export type GovernedAction =
  | 'write_artifacts'
  | 'read_artifacts'
  | 'approve_hitl'
  | 'resume_pipeline'
  | 'send_recruiter_email'
  | 'update_crm'
  | 'save_workdrive'
  | 'browser_submit';

export type GovernedExecutionResult = {
  ok: boolean;
  action: GovernedAction;
  executed: boolean;
  reason?: string;
};

const DISABLED_BY_DEFAULT: GovernedAction[] = [
  'send_recruiter_email',
  'update_crm',
  'save_workdrive',
  'browser_submit',
];

export function isGovernedActionAllowed(action: GovernedAction): boolean {
  if (DISABLED_BY_DEFAULT.includes(action)) return false;
  return true;
}

export function assertGovernedActionAllowed(action: GovernedAction): void {
  if (!isGovernedActionAllowed(action)) {
    throw new Error(`Governed action '${action}' is disabled by default.`);
  }
}

export async function executeGovernedAction(input: {
  action: GovernedAction;
  payload?: Record<string, unknown>;
}): Promise<GovernedExecutionResult> {
  const { action, payload } = input;

  if (!isGovernedActionAllowed(action)) {
    switch (action) {
      case 'send_recruiter_email':
        return { ok: false, action, executed: false, reason: 'Email sending is disabled by default.' };
      case 'update_crm':
        return { ok: false, action, executed: false, reason: 'CRM updates are disabled by default.' };
      case 'save_workdrive':
        return { ok: false, action, executed: false, reason: 'WorkDrive saves are disabled by default.' };
      case 'browser_submit':
        return { ok: false, action, executed: false, reason: 'Browser automation submission is disabled by default.' };
      default:
        return { ok: false, action, executed: false, reason: `Action '${action}' is disabled by default.` };
    }
  }

  switch (action) {
    case 'write_artifacts':
      return { ok: true, action, executed: true, reason: 'Artifact write governed by idempotent artifact writer.' };
    case 'read_artifacts':
      return { ok: true, action, executed: true, reason: 'Read governed by artifact path boundary.' };
    case 'approve_hitl':
      return { ok: true, action, executed: true, reason: 'HITL approval governed by existing admin API.' };
    case 'resume_pipeline':
      return { ok: true, action, executed: true, reason: 'Resume governed by existing admin API.' };
    default:
      return { ok: false, action, executed: false, reason: 'Unknown governed action.' };
  }
}
