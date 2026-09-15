import type { RunManagerErrorCode } from '@revisium/revo-run';

import { ApplicationError } from '../../../application/errors/application-error.js';

export const RunErrorCode = {
  selectorInvalid: 'run_selector_invalid',
  projectIdInvalid: 'project_id_invalid',
  projectUnavailable: 'project_unavailable',
  projectArchived: 'project_archived',
  agentRuntimeUnavailable: 'agent_runtime_unavailable',
  invalidListRunsFilter: 'invalid_list_runs_filter',
  invalidCreateRunInput: 'invalid_create_run_input',
  invalidRunId: 'invalid_run_id',
  invalidRunEventPageInput: 'invalid_run_event_page_input',
  invalidRunEventSubscriptionInput: 'invalid_run_event_subscription_input',
  invalidWaitForTerminalInput: 'invalid_wait_for_terminal_input',
  managerNotStarted: 'manager_not_started',
  managerStartFailed: 'manager_start_failed',
  managerStopFailed: 'manager_stop_failed',
  pipelineCompilationFailed: 'pipeline_compilation_failed',
  runAdmissionFailed: 'run_admission_failed',
  runEventCursorInvalid: 'run_event_cursor_invalid',
  runEventSubscriptionFailed: 'run_event_subscription_failed',
  runGateAlreadyResolved: 'run_gate_already_resolved',
  runGateAnswerInvalid: 'run_gate_answer_invalid',
  runGateNotFound: 'run_gate_not_found',
  runGatePayloadInvalid: 'run_gate_payload_invalid',
  runGateUnauthorized: 'run_gate_unauthorized',
  runIdConflict: 'run_id_conflict',
  runInteractionFailed: 'run_interaction_failed',
  runNotFound: 'run_not_found',
  runProfileInvalid: 'run_profile_invalid',
  runReadFailed: 'run_read_failed',
  runRecoveryRequired: 'run_recovery_required',
  runRequirementUnresolved: 'run_requirement_unresolved',
  runSignalInvalid: 'run_signal_invalid',
  runSignalPayloadInvalid: 'run_signal_payload_invalid',
  runWaitAborted: 'run_wait_aborted',
  runWaitAlreadyResolved: 'run_wait_already_resolved',
  runWaitNotFound: 'run_wait_not_found',
  runWaitTimedOut: 'run_wait_timed_out',
} as const;

export type RunErrorCode = (typeof RunErrorCode)[keyof typeof RunErrorCode];
export type CompleteRunManagerCodes = Exclude<
  RunErrorCode,
  'run_selector_invalid' | 'project_id_invalid' | 'project_unavailable' | 'project_archived'
>;
export type CompleteRunManagerPayloads = {
  [TCode in RunManagerErrorCode]: Readonly<{
    code: TCode;
    details: RunErrorDetails[TCode];
  }>;
};
type Empty = Record<string, never>;
type WithPath = { readonly path: string | null };

export type RunErrorDetails = {
  run_selector_invalid: {
    readonly selector: 'pipeline' | 'profile';
    readonly reason: 'required' | 'conflict' | 'invalid_id';
  };
  project_id_invalid: Empty;
  project_unavailable: Empty;
  project_archived: Empty;
  agent_runtime_unavailable: Empty;
  invalid_list_runs_filter: WithPath & { readonly reason: string };
  invalid_create_run_input: WithPath & { readonly reason: string };
  invalid_run_id: WithPath & { readonly reason: string };
  invalid_run_event_page_input: WithPath & { readonly reason: string };
  invalid_run_event_subscription_input: WithPath & { readonly reason: string };
  invalid_wait_for_terminal_input: WithPath & { readonly reason: string };
  manager_not_started: { readonly lifecycle: string };
  manager_start_failed: { readonly operation: string };
  manager_stop_failed: { readonly operation: string };
  pipeline_compilation_failed: {
    readonly diagnostics: readonly {
      family: string;
      code: string;
      path: string;
      message: string;
    }[];
  };
  run_admission_failed: { readonly operation: string };
  run_event_cursor_invalid: { readonly runId: string; readonly reason: string };
  run_event_subscription_failed: { readonly runId: string };
  run_gate_already_resolved: {
    readonly runId: string;
    readonly gateId: string;
    readonly path: string | null;
  };
  run_gate_answer_invalid: {
    readonly runId: string;
    readonly gateId: string;
    readonly path: string | null;
  };
  run_gate_not_found: {
    readonly runId: string;
    readonly gateId: string;
    readonly path: string | null;
  };
  run_gate_payload_invalid: {
    readonly runId: string;
    readonly gateId: string;
    readonly path: string | null;
  };
  run_gate_unauthorized: {
    readonly runId: string;
    readonly gateId: string;
    readonly path: string | null;
  };
  run_id_conflict: Empty;
  run_interaction_failed: { readonly runId: string; readonly operation: string };
  run_not_found: { readonly runId: string };
  run_profile_invalid: WithPath & { readonly reason: string };
  run_read_failed: { readonly runId: string | null; readonly operation: string };
  run_recovery_required: {
    readonly runId: string;
    readonly attempts: readonly { operationId: string; attemptId: string }[];
  };
  run_requirement_unresolved: {
    readonly requirementKey: string;
    readonly bindingKey: string | null;
    readonly reason: string;
  };
  run_signal_invalid: {
    readonly runId: string;
    readonly waitId: string;
    readonly path: '/signal' | '/payload';
  };
  run_signal_payload_invalid: {
    readonly runId: string;
    readonly waitId: string;
    readonly path: '/signal' | '/payload';
  };
  run_wait_aborted: { readonly runId: string };
  run_wait_already_resolved: {
    readonly runId: string;
    readonly waitId: string;
    readonly path: null;
  };
  run_wait_not_found: { readonly runId: string; readonly waitId: string; readonly path: null };
  run_wait_timed_out: { readonly runId: string; readonly timeoutMs: number };
};

type LocalRunFailure = {
  [TCode in Exclude<RunErrorCode, RunManagerErrorCode>]: Readonly<{
    code: TCode;
    details: RunErrorDetails[TCode];
  }>;
}[Exclude<RunErrorCode, RunManagerErrorCode>];

export type RunFailure = LocalRunFailure | CompleteRunManagerPayloads[RunManagerErrorCode];

export class RunApplicationError extends ApplicationError<RunFailure> {}
