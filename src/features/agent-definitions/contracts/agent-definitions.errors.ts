import { AgentManagerError, type AgentFault } from '@revisium/revo-agent-runtime';

export const AgentDefinitionsErrorCode = {
  invalidInput: 'REVO_AGENT_SESSION_INVALID_INPUT',
  invalidCursor: 'REVO_AGENT_SESSION_INVALID_CURSOR',
  expiredCursor: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
  notFound: 'REVO_AGENT_SESSION_NOT_FOUND',
  conflict: 'REVO_AGENT_SESSION_CONFLICT',
  unsupported: 'REVO_AGENT_SESSION_UNSUPPORTED',
  unavailable: 'REVO_AGENT_SESSION_UNAVAILABLE',
  internal: 'REVO_AGENT_SESSION_INTERNAL',
} as const;

export type AgentDefinitionsErrorCode =
  (typeof AgentDefinitionsErrorCode)[keyof typeof AgentDefinitionsErrorCode];

export class AgentDefinitionsApplicationError extends Error {
  constructor(
    readonly code: AgentDefinitionsErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
  }
}

export const mapAgentDefinitionsError = (error: unknown): AgentDefinitionsApplicationError => {
  if (error instanceof AgentDefinitionsApplicationError) {
    return error;
  }

  if (error instanceof AgentManagerError) {
    const code = error.fault.code;
    const publicCode = classifyRuntimeFault(code);

    return new AgentDefinitionsApplicationError(publicCode, publicAgentErrorMessage(publicCode), {
      runtimeCode: code,
      retryable: error.fault.retryable,
    });
  }

  return new AgentDefinitionsApplicationError(
    AgentDefinitionsErrorCode.internal,
    'Agent definition operation failed.',
  );
};

const runtimeErrorCodes: Record<AgentFault['code'], AgentDefinitionsErrorCode> = {
  'revo.agent.agent_unknown': AgentDefinitionsErrorCode.notFound,
  'revo.agent.definition_duplicate': AgentDefinitionsErrorCode.conflict,
  'revo.agent.definition_invalid': AgentDefinitionsErrorCode.internal,
  'revo.agent.internal': AgentDefinitionsErrorCode.internal,
  'revo.agent.invocation_duplicate': AgentDefinitionsErrorCode.conflict,
  'revo.agent.invocation_unknown': AgentDefinitionsErrorCode.notFound,
  'revo.agent.parameters_invalid': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.permissions_invalid': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.workspace_invalid': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.output_path_invalid': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.output_conflict': AgentDefinitionsErrorCode.conflict,
  'revo.agent.platform_unsupported': AgentDefinitionsErrorCode.unsupported,
  'revo.agent.probe_platform_unsupported': AgentDefinitionsErrorCode.unsupported,
  'revo.agent.probe_spawn_failed': AgentDefinitionsErrorCode.internal,
  'revo.agent.probe_timeout': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.probe_output_too_large': AgentDefinitionsErrorCode.internal,
  'revo.agent.probe_process_failed': AgentDefinitionsErrorCode.internal,
  'revo.agent.probe_output_invalid': AgentDefinitionsErrorCode.internal,
  'revo.agent.manager_closed': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.manager_not_initialized': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.limit_invalid': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.cancelled': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.configuration_stale': AgentDefinitionsErrorCode.conflict,
  'revo.agent.configuration_value_unsupported': AgentDefinitionsErrorCode.unsupported,
  'revo.agent.timeout': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.process_cleanup_failed': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.shutdown_failed': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.protocol_failed': AgentDefinitionsErrorCode.internal,
  'revo.agent.output_write_failed': AgentDefinitionsErrorCode.internal,
  'revo.agent.active_state_failed': AgentDefinitionsErrorCode.internal,
  'revo.agent.result_missing': AgentDefinitionsErrorCode.internal,
  'revo.agent.result_too_large': AgentDefinitionsErrorCode.internal,
  'revo.agent.result_invalid_json': AgentDefinitionsErrorCode.internal,
  'revo.agent.result_not_object': AgentDefinitionsErrorCode.internal,
  'revo.agent.result_schema_mismatch': AgentDefinitionsErrorCode.internal,
  'revo.agent.strategy_unsupported': AgentDefinitionsErrorCode.unsupported,
  'revo.agent.session_state_unavailable': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.session_unsupported': AgentDefinitionsErrorCode.unsupported,
  'revo.agent.session_duplicate': AgentDefinitionsErrorCode.conflict,
  'revo.agent.session_unknown': AgentDefinitionsErrorCode.notFound,
  'revo.agent.session_closed': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.session_busy': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.session_capacity': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.session_identity_capacity': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.session_backpressure': AgentDefinitionsErrorCode.unavailable,
  'revo.agent.turn_duplicate': AgentDefinitionsErrorCode.conflict,
  'revo.agent.turn_incomplete': AgentDefinitionsErrorCode.internal,
  'revo.agent.interaction_unknown': AgentDefinitionsErrorCode.notFound,
  'revo.agent.interaction_conflict': AgentDefinitionsErrorCode.conflict,
  'revo.agent.interaction_invalid': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.checkpoint_invalid': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.resume_token_invalid': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.resume_token_consumed': AgentDefinitionsErrorCode.conflict,
  'revo.agent.continuation_pin_mismatch': AgentDefinitionsErrorCode.conflict,
  'revo.agent.checkpoint_unsupported': AgentDefinitionsErrorCode.unsupported,
  'revo.agent.continuation_too_large': AgentDefinitionsErrorCode.invalidInput,
  'revo.agent.event_conflict': AgentDefinitionsErrorCode.conflict,
  'revo.agent.event_sink_failed': AgentDefinitionsErrorCode.internal,
  'revo.agent.session_output_too_large': AgentDefinitionsErrorCode.internal,
};

function classifyRuntimeFault(code: AgentFault['code']): AgentDefinitionsErrorCode {
  return runtimeErrorCodes[code];
}

function publicAgentErrorMessage(code: AgentDefinitionsErrorCode): string {
  if (code === AgentDefinitionsErrorCode.notFound) {
    return 'Agent definition was not found.';
  }

  if (code === AgentDefinitionsErrorCode.invalidInput) {
    return 'Agent definition input is invalid.';
  }

  if (code === AgentDefinitionsErrorCode.unsupported) {
    return 'Agent definition operation is unsupported.';
  }

  if (code === AgentDefinitionsErrorCode.unavailable) {
    return 'Agent definition operation is unavailable.';
  }

  if (code === AgentDefinitionsErrorCode.conflict) {
    return 'Agent definition operation conflicts with current state.';
  }

  return 'Agent definition operation failed.';
}
