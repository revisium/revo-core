import { RunManagerError, type RunManagerErrorCode, type JsonObject } from '@revisium/revo-run';

import { RunApplicationError } from './contracts/run.errors.js';

type RunErrorMapping = Readonly<{
  report?: boolean;
  sanitizeDetails?: boolean;
}>;

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
  run_id_conflict: {
    sanitizeDetails: true,
    report: true,
  },
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

  const mapping = RUN_MANAGER_ERROR_MAPPING[error.code] as RunErrorMapping;
  const path = typeof error.details.path === 'string' ? error.details.path : null;
  const details = mapping.sanitizeDetails ? {} : withoutPath(error.details);
  throw new RunApplicationError(error.code, narrowRunDetails(error.code, details, path));
}

function withoutPath(details: JsonObject): JsonObject {
  return Object.fromEntries(Object.entries(details).filter(([key]) => key !== 'path'));
}

function narrowRunDetails(
  code: RunManagerErrorCode,
  details: JsonObject,
  path: string | null,
): Record<string, unknown> {
  if (code === 'run_id_conflict' || code === 'agent_runtime_unavailable') {
    return {};
  }
  if (code.includes('selector')) {
    return {
      selector: code.includes('profile') ? 'profile' : 'pipeline',
      reason: text(details.reason),
    };
  }
  if (
    code === 'invalid_list_runs_filter' ||
    code === 'invalid_create_run_input' ||
    code === 'invalid_run_id' ||
    code === 'invalid_run_event_page_input' ||
    code === 'invalid_run_event_subscription_input' ||
    code === 'invalid_wait_for_terminal_input' ||
    code === 'run_profile_invalid'
  ) {
    return { path, reason: text(details.reason) };
  }
  if (code === 'pipeline_compilation_failed') {
    return { diagnostics: diagnostics(details.diagnostics) };
  }
  if (code === 'run_recovery_required') {
    return { runId: text(details.runId), attempts: attempts(details.attempts) };
  }
  const keys = [
    'lifecycle',
    'operation',
    'runId',
    'waitId',
    'gateId',
    'requirementKey',
    'bindingKey',
    'reason',
    'timeoutMs',
  ];
  return Object.fromEntries(
    keys.filter((key) => key in details).map((key) => [key, text(details[key])]),
  );
}

function text(value: unknown): string | number | null {
  return typeof value === 'string' || typeof value === 'number' || value === null ? value : '';
}

function diagnostics(value: unknown): readonly Record<string, string>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return (value as readonly unknown[]).flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const record = item;
    return [
      {
        family: stringValue(record.family),
        code: stringValue(record.code),
        path: stringValue(record.path),
        message: stringValue(record.message),
      },
    ];
  });
}

function attempts(value: unknown): readonly Record<string, string>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return (value as readonly unknown[]).flatMap((item) => {
    if (!isRecord(item)) {
      return [];
    }
    const record = item;
    return [
      { operationId: stringValue(record.operationId), attemptId: stringValue(record.attemptId) },
    ];
  });
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
