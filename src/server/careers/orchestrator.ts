export type CareerOpsRunStatus =
  | 'not_created'
  | 'validated_input'
  | 'workspace_prepared'
  | 'workspace_validated'
  | 'ready_for_scan'
  | 'blocked'
  | 'error';

export type CareerOpsTransition =
  | 'create'
  | 'validate_input'
  | 'prepare_workspace'
  | 'validate_workspace'
  | 'start_scan'
  | 'block'
  | 'error'
  | 'resume';

export type CareerOpsRun = {
  id: string;
  status: CareerOpsRunStatus;
  updatedAt: string;
  logs: string[];
};

export type CareerOpsStateMachineOptions = {
  createdAt?: string;
};

const ALLOWED: Record<CareerOpsRunStatus, CareerOpsTransition[]> = {
  not_created: ['create'],
  validated_input: ['validate_input', 'prepare_workspace'],
  workspace_prepared: ['validate_workspace'],
  workspace_validated: ['start_scan', 'block', 'error'],
  ready_for_scan: ['block', 'error'],
  blocked: ['resume', 'error'],
  error: ['resume', 'block'],
};

function appendLog(run: CareerOpsRun, message: string) {
  run.logs = [...run.logs.slice(-200), `[${new Date().toISOString()}] ${message}`];
}

function advance(run: CareerOpsRun, next: CareerOpsRunStatus, message: string) {
  appendLog(run, `${run.status} -> ${next}: ${message}`);
  run.status = next;
  run.updatedAt = new Date().toISOString();
  return run;
}

export function createCareerOpsRun(id: string, options: CareerOpsStateMachineOptions = {}): CareerOpsRun {
  const run: CareerOpsRun = {
    id,
    status: 'not_created',
    updatedAt: options.createdAt || new Date().toISOString(),
    logs: [`[${options.createdAt || new Date().toISOString()}] created run ${id}`],
  };
  return run;
}

export function tryTransition(run: CareerOpsRun, transition: CareerOpsTransition): CareerOpsRun {
  const allowed = ALLOWED[run.status] || [];
  if (!allowed.includes(transition)) {
    const error = new Error(`Invalid transition ${transition} from ${run.status}`);
    appendLog(run, error.message);
    run.status = 'error';
    run.updatedAt = new Date().toISOString();
    return run;
  }

  if (transition === 'create') return advance(run, 'validated_input', 'Created');
  if (transition === 'validate_input') return advance(run, 'workspace_prepared', 'Validated input');
  if (transition === 'prepare_workspace') return advance(run, 'workspace_prepared', 'Prepared workspace');
  if (transition === 'validate_workspace') return advance(run, 'workspace_validated', 'Validated workspace');
  if (transition === 'start_scan') return advance(run, 'ready_for_scan', 'Started scan');
  if (transition === 'block') return advance(run, 'blocked', 'Blocked by policy');
  if (transition === 'resume') return advance(run, 'workspace_validated', 'Resumed after block');
  if (transition === 'error') return advance(run, 'error', 'Entered error state');
  return advance(run, 'error', `Unhandled transition ${transition}`);
}

export function isTerminal(status: CareerOpsRunStatus) {
  return status === 'ready_for_scan';
}

export function isBlocked(status: CareerOpsRunStatus) {
  return status === 'blocked';
}

export function canAdvancePastWorkspace(status: CareerOpsRunStatus) {
  return status === 'workspace_validated' || status === 'ready_for_scan';
}
