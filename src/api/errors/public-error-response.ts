import type { ApplicationError } from '../../application/errors/application-error.js';
import { publicErrorDefinitions, type ApplicationErrorCode } from './public-error-definitions.js';

export type PublicErrorResponse = {
  statusCode: number;
  code?: string;
  message: string;
  path?: string | null;
  field?: string;
  details?: Record<string, unknown>;
  description?: string;
  error?: string;
};

export function publicErrorResponse<TCode extends ApplicationErrorCode, TDetails extends object>(
  error: ApplicationError<TCode, TDetails>,
  transport: 'http' | 'graphql' = 'http',
): PublicErrorResponse {
  const definition = Object.entries(publicErrorDefinitions).find(
    ([code]) => code === error.code,
  )?.[1];
  if (definition === undefined) {
    return { statusCode: 500, message: 'Internal server error.' };
  }

  if (transport === 'graphql' && definition.graphqlOrdinary) {
    return { statusCode: definition.status, message: definition.message };
  }

  const response: PublicErrorResponse & Record<string, unknown> = {
    statusCode: definition.status,
    message: definition.message,
  };

  if (transport === 'http' && definition.restError !== undefined) {
    response.error = definition.restError;
  } else if (definition.publicCode !== undefined) {
    response.code = definition.publicCode;
  }
  if (definition.description !== undefined) {
    response.description = definition.description;
  }

  addPayload(response, error.code, error.details, transport, definition.graphqlLean === true);
  return response;
}

function addPayload(
  response: Record<string, unknown>,
  code: ApplicationErrorCode,
  details: object,
  transport: 'http' | 'graphql',
  leanGraphql: boolean,
): void {
  if (code === 'PROJECT_HAS_ACTIVE_RUNS') {
    const runIds = isRunIdsDetails(details) ? details.runIds : [];
    response.path = '/projectId';
    response.details = { runIds: [...runIds] };
    return;
  }

  if (code.startsWith('PROJECT_')) {
    return;
  }

  if (
    code === 'WORKSPACE_INVALID_INPUT' &&
    'field' in details &&
    typeof details.field === 'string'
  ) {
    response.field = details.field;
    return;
  }

  if (code.startsWith('WORKSPACE_') || code.startsWith('FILE_SYSTEM_')) {
    return;
  }

  if (code.startsWith('REVO_')) {
    if (transport === 'graphql') {
      response.path = null;
      response.details = {};
    }
    return;
  }

  if (transport === 'graphql' && leanGraphql) {
    if (code.startsWith('REVO_')) {
      response.path = null;
    }
    return;
  }

  if (code === 'run_selector_invalid') {
    const selector = (details as { readonly selector?: 'pipeline' | 'profile' }).selector;
    response.path = selector === 'profile' ? '/profile' : '/pipeline';
    response.details = { reason: reason(details) };
    response.message =
      selector === 'profile'
        ? 'Exactly one profile selector is required.'
        : 'Exactly one pipeline selector is required.';
    return;
  }

  if (
    code === 'project_id_invalid' ||
    code === 'project_unavailable' ||
    code === 'project_archived'
  ) {
    response.path = '/projectId';
    response.details = code === 'project_id_invalid' ? { reason: 'required' } : {};
    return;
  }

  if (code === 'catalog_definition_corrupt') {
    response.path = inputPath(details, '/pipeline');
    response.details = { reason: 'storage_json' };
    return;
  }

  response.path = nullablePath(details);
  response.details = allowedRunDetails(code, details);
}

function allowedRunDetails(code: ApplicationErrorCode, details: object): Record<string, unknown> {
  const allowed = runDetailKeys[code] ?? [];
  const output: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in details) {
      output[key] = cloneDetail(key, new Map(Object.entries(details)).get(key));
    }
  }
  return output;
}

const runDetailKeys: Partial<Record<string, readonly string[]>> = {
  agent_runtime_unavailable: [],
  invalid_list_runs_filter: ['reason'],
  invalid_create_run_input: ['reason'],
  invalid_run_id: ['reason'],
  invalid_run_event_page_input: ['reason'],
  invalid_run_event_subscription_input: ['reason'],
  invalid_wait_for_terminal_input: ['reason'],
  manager_not_started: ['lifecycle'],
  manager_start_failed: ['operation'],
  manager_stop_failed: ['operation'],
  pipeline_compilation_failed: ['diagnostics'],
  run_admission_failed: ['operation'],
  run_event_cursor_invalid: ['runId', 'reason'],
  run_event_subscription_failed: ['runId'],
  run_gate_already_resolved: ['runId', 'gateId'],
  run_gate_answer_invalid: ['runId', 'gateId'],
  run_gate_not_found: ['runId', 'gateId'],
  run_gate_payload_invalid: ['runId', 'gateId'],
  run_gate_unauthorized: ['runId', 'gateId'],
  run_interaction_failed: ['runId', 'operation'],
  run_not_found: ['runId'],
  run_profile_invalid: ['reason'],
  run_read_failed: ['runId', 'operation'],
  run_recovery_required: ['runId', 'attempts'],
  run_requirement_unresolved: ['requirementKey', 'bindingKey', 'reason'],
  run_signal_invalid: ['runId', 'waitId'],
  run_signal_payload_invalid: ['runId', 'waitId'],
  run_wait_aborted: ['runId'],
  run_wait_already_resolved: ['runId', 'waitId'],
  run_wait_not_found: ['runId', 'waitId'],
  run_wait_timed_out: ['runId', 'timeoutMs'],
};

function cloneDetail(key: string, value: unknown): unknown {
  if (key === 'diagnostics' && Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }
      return [
        {
          family: stringValue(item.family),
          code: stringValue(item.code),
          path: stringValue(item.path),
          message: stringValue(item.message),
        },
      ];
    });
  }
  if (key === 'attempts' && Array.isArray(value)) {
    return value.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }
      return [
        { operationId: stringValue(item.operationId), attemptId: stringValue(item.attemptId) },
      ];
    });
  }
  return typeof value === 'string' || typeof value === 'number' || value === null
    ? value
    : undefined;
}

function nullablePath(details: object): string | null {
  return 'path' in details && (typeof details.path === 'string' || details.path === null)
    ? details.path
    : null;
}

function inputPath(details: object, fallback: string): string {
  if ('path' in details && (details.path === 'pipeline' || details.path === 'profile')) {
    return `/${details.path}`;
  }
  return fallback;
}

function reason(details: object): string {
  return 'reason' in details && typeof details.reason === 'string' ? details.reason : 'required';
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRunIdsDetails(value: object): value is { readonly runIds: readonly string[] } {
  return (
    'runIds' in value &&
    Array.isArray(value.runIds) &&
    value.runIds.every((id) => typeof id === 'string')
  );
}
