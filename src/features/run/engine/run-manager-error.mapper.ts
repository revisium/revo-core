import { RunManagerError, type RunManagerErrorCode, type JsonObject } from '@revisium/revo-run';

import { RunApplicationError, type RunFailure } from '../contracts/run.errors.js';

type RunErrorMapping = Readonly<{ report?: boolean; sanitizeDetails?: boolean }>;

const RUN_MANAGER_ERROR_MAPPING = {
  agent_runtime_unavailable: { report: true },
  invalid_create_run_input: {},
  invalid_list_runs_filter: {},
  invalid_run_event_page_input: {},
  invalid_run_event_subscription_input: {},
  invalid_run_id: {},
  invalid_wait_for_terminal_input: {},
  manager_not_started: { report: true },
  manager_start_failed: { report: true },
  manager_stop_failed: { report: true },
  pipeline_compilation_failed: {},
  run_admission_failed: { report: true },
  run_event_cursor_invalid: {},
  run_event_subscription_failed: { report: true },
  run_gate_already_resolved: {},
  run_gate_answer_invalid: {},
  run_gate_not_found: {},
  run_gate_payload_invalid: {},
  run_gate_unauthorized: {},
  run_id_conflict: { sanitizeDetails: true, report: true },
  run_interaction_failed: { report: true },
  run_not_found: {},
  run_profile_invalid: {},
  run_read_failed: { report: true },
  run_recovery_required: {},
  run_requirement_unresolved: {},
  run_signal_invalid: {},
  run_signal_payload_invalid: {},
  run_wait_aborted: { report: true },
  run_wait_already_resolved: {},
  run_wait_not_found: {},
  run_wait_timed_out: { report: true },
} as const satisfies Record<RunManagerErrorCode, RunErrorMapping>;

export function isReportableRunError(error: unknown): error is RunManagerError {
  if (!(error instanceof RunManagerError)) {
    return false;
  }
  const mapping: RunErrorMapping = RUN_MANAGER_ERROR_MAPPING[error.code];
  return mapping.report === true;
}

export function rethrowPublicRunError(error: unknown): never {
  if (!(error instanceof RunManagerError)) {
    throw error;
  }
  const mapping: RunErrorMapping = RUN_MANAGER_ERROR_MAPPING[error.code];
  throw new RunApplicationError(
    convertFailure(error.code, mapping.sanitizeDetails ? {} : error.details),
  );
}

function convertFailure(code: RunManagerErrorCode, details: JsonObject): RunFailure {
  switch (code) {
    case 'agent_runtime_unavailable':
      return { code, details: {} };
    case 'invalid_list_runs_filter':
      return { code, details: inputDetails(details) };
    case 'invalid_create_run_input':
      return { code, details: inputDetails(details) };
    case 'invalid_run_id':
      return { code, details: inputDetails(details) };
    case 'invalid_run_event_page_input':
      return { code, details: inputDetails(details) };
    case 'invalid_run_event_subscription_input':
      return { code, details: inputDetails(details) };
    case 'invalid_wait_for_terminal_input':
      return { code, details: inputDetails(details) };
    case 'manager_not_started':
      return {
        code,
        details: { lifecycle: oneOf(details.lifecycle, ['created', 'stopping', 'stopped']) },
      };
    case 'manager_start_failed':
      return {
        code,
        details: { operation: oneOf(details.operation, ['dbos_launch', 'host_initialization']) },
      };
    case 'manager_stop_failed':
      return {
        code,
        details: {
          operation: oneOf(details.operation, [
            'agent_shutdown',
            'scripts_shutdown',
            'dbos_shutdown',
          ]),
        },
      };
    case 'pipeline_compilation_failed':
      return { code, details: { diagnostics: diagnosticList(details.diagnostics) } };
    case 'run_admission_failed':
      return {
        code,
        details: { operation: oneOf(details.operation, ['admission_commit', 'workflow_start']) },
      };
    case 'run_event_cursor_invalid':
      return {
        code,
        details: {
          runId: requiredString(details.runId),
          reason: oneOf(details.reason, ['malformed', 'foreign', 'ahead']),
        },
      };
    case 'run_event_subscription_failed':
      return { code, details: { runId: requiredString(details.runId) } };
    case 'run_gate_already_resolved':
      return { code, details: gateDetails(details) };
    case 'run_gate_answer_invalid':
      return { code, details: gateDetails(details) };
    case 'run_gate_not_found':
      return { code, details: gateDetails(details) };
    case 'run_gate_payload_invalid':
      return { code, details: gateDetails(details) };
    case 'run_gate_unauthorized':
      return { code, details: gateDetails(details) };
    case 'run_id_conflict':
      return { code, details: {} };
    case 'run_interaction_failed':
      return {
        code,
        details: {
          runId: requiredString(details.runId),
          operation: requiredString(details.operation),
        },
      };
    case 'run_not_found':
      return { code, details: { runId: requiredString(details.runId) } };
    case 'run_profile_invalid':
      return { code, details: inputDetails(details) };
    case 'run_read_failed':
      return {
        code,
        details: {
          runId: nullableString(details.runId),
          operation: requiredString(details.operation),
        },
      };
    case 'run_recovery_required':
      return {
        code,
        details: { runId: requiredString(details.runId), attempts: attemptList(details.attempts) },
      };
    case 'run_requirement_unresolved':
      return {
        code,
        details: {
          requirementKey: requiredString(details.requirementKey),
          bindingKey: nullableString(details.bindingKey),
          reason: requiredString(details.reason),
        },
      };
    case 'run_signal_invalid':
      return { code, details: signalDetails(details) };
    case 'run_signal_payload_invalid':
      return { code, details: signalDetails(details) };
    case 'run_wait_aborted':
      return { code, details: { runId: requiredString(details.runId) } };
    case 'run_wait_already_resolved':
      return {
        code,
        details: {
          runId: requiredString(details.runId),
          waitId: requiredString(details.waitId),
          path: null,
        },
      };
    case 'run_wait_not_found':
      return {
        code,
        details: {
          runId: requiredString(details.runId),
          waitId: requiredString(details.waitId),
          path: null,
        },
      };
    case 'run_wait_timed_out':
      return {
        code,
        details: {
          runId: requiredString(details.runId),
          timeoutMs: numberValue(details.timeoutMs),
        },
      };
  }
  return assertNever(code);
}

function assertNever(value: never): never {
  throw new Error('Unsupported Run manager code: ' + String(value));
}

function inputDetails(details: JsonObject): { path: string | null; reason: string } {
  return { path: nullableString(details.path), reason: requiredString(details.reason) };
}
function gateDetails(details: JsonObject) {
  return {
    runId: requiredString(details.runId),
    gateId: requiredString(details.gateId),
    path: details.path === undefined ? null : nullableString(details.path),
  };
}
function signalDetails(details: JsonObject) {
  return {
    runId: requiredString(details.runId),
    waitId: requiredString(details.waitId),
    path: oneOf(details.path, ['/signal', '/payload']),
  };
}
function requiredString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Malformed Run manager error details.');
  }
  return value;
}
function nullableString(value: unknown): string | null {
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error('Malformed Run manager error details.');
}
function numberValue(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Malformed Run manager error details.');
  }
  return value;
}
function oneOf<T extends string>(value: unknown, choices: readonly T[]): T {
  const selected = choices.find((choice) => choice === value);
  if (selected !== undefined) {
    return selected;
  }
  throw new Error('Malformed Run manager error details.');
}
function diagnosticList(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error('Malformed Run manager diagnostics.');
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new Error('Malformed Run manager diagnostics.');
    }
    return {
      family: requiredString(item.family),
      code: requiredString(item.code),
      path: requiredString(item.path),
      message: requiredString(item.message),
    };
  });
}
function attemptList(value: unknown) {
  if (!Array.isArray(value)) {
    throw new Error('Malformed Run manager attempts.');
  }
  return value.map((item) => {
    if (!isRecord(item)) {
      throw new Error('Malformed Run manager attempts.');
    }
    return {
      operationId: requiredString(item.operationId),
      attemptId: requiredString(item.attemptId),
    };
  });
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
