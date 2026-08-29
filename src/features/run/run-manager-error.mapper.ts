import { HttpException, HttpStatus } from '@nestjs/common';
import { RunManagerError, type RunManagerErrorCode, type JsonObject } from '@revisium/revo-run';

type RunErrorMapping = Readonly<{
  status: number;
  code?: string;
  message?: string;
  sanitizeDetails?: boolean;
}>;

export const RUN_MANAGER_ERROR_MAPPING = {
  agent_runtime_unavailable: { status: HttpStatus.SERVICE_UNAVAILABLE },
  invalid_create_run_input: { status: HttpStatus.BAD_REQUEST },
  invalid_list_runs_filter: { status: HttpStatus.BAD_REQUEST },
  invalid_run_event_page_input: { status: HttpStatus.BAD_REQUEST },
  invalid_run_event_subscription_input: { status: HttpStatus.BAD_REQUEST },
  invalid_run_id: { status: HttpStatus.BAD_REQUEST },
  invalid_wait_for_terminal_input: { status: HttpStatus.BAD_REQUEST },
  manager_not_started: { status: HttpStatus.SERVICE_UNAVAILABLE },
  manager_start_failed: { status: HttpStatus.SERVICE_UNAVAILABLE },
  manager_stop_failed: { status: HttpStatus.SERVICE_UNAVAILABLE },
  pipeline_compilation_failed: { status: HttpStatus.UNPROCESSABLE_ENTITY },
  run_admission_failed: { status: HttpStatus.SERVICE_UNAVAILABLE },
  run_event_cursor_invalid: { status: HttpStatus.BAD_REQUEST },
  run_event_subscription_failed: { status: HttpStatus.SERVICE_UNAVAILABLE },
  run_gate_already_resolved: { status: HttpStatus.CONFLICT },
  run_gate_answer_invalid: { status: HttpStatus.BAD_REQUEST },
  run_gate_not_found: { status: HttpStatus.NOT_FOUND },
  run_gate_payload_invalid: { status: HttpStatus.BAD_REQUEST },
  run_gate_unauthorized: { status: HttpStatus.FORBIDDEN },
  run_id_conflict: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'RUN_ID_ALLOCATION_CONFLICT',
    message: 'A run ID could not be allocated.',
    sanitizeDetails: true,
  },
  run_interaction_failed: { status: HttpStatus.SERVICE_UNAVAILABLE },
  run_not_found: { status: HttpStatus.NOT_FOUND },
  run_profile_invalid: { status: HttpStatus.UNPROCESSABLE_ENTITY },
  run_read_failed: { status: HttpStatus.SERVICE_UNAVAILABLE },
  run_recovery_required: { status: HttpStatus.CONFLICT },
  run_requirement_unresolved: { status: HttpStatus.UNPROCESSABLE_ENTITY },
  run_signal_invalid: { status: HttpStatus.BAD_REQUEST },
  run_signal_payload_invalid: { status: HttpStatus.BAD_REQUEST },
  run_wait_aborted: { status: HttpStatus.SERVICE_UNAVAILABLE },
  run_wait_already_resolved: { status: HttpStatus.CONFLICT },
  run_wait_not_found: { status: HttpStatus.NOT_FOUND },
  run_wait_timed_out: { status: HttpStatus.GATEWAY_TIMEOUT },
} as const satisfies Record<RunManagerErrorCode, RunErrorMapping>;

export type PublicRunError = Readonly<{
  statusCode: number;
  code: string;
  message: string;
  path: string | null;
  details: JsonObject;
}>;

export function rethrowPublicRunError(error: unknown): never {
  if (!(error instanceof RunManagerError)) {
    throw error;
  }

  const mapping: RunErrorMapping = RUN_MANAGER_ERROR_MAPPING[error.code];
  const path = typeof error.details.path === 'string' ? error.details.path : null;
  const details = mapping.sanitizeDetails ? {} : withoutPath(error.details);
  const response: PublicRunError = {
    statusCode: mapping.status,
    code: mapping.code ?? error.code,
    message: mapping.message ?? error.message,
    path,
    details,
  };

  throw new HttpException(response, mapping.status);
}

function withoutPath(details: JsonObject): JsonObject {
  return Object.fromEntries(Object.entries(details).filter(([key]) => key !== 'path'));
}
