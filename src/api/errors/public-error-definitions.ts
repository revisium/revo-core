import type { AgentDefinitionsErrorCode } from '../../features/agent-definitions/contracts/agent-definitions.errors.js';
import type { FileSystemErrorCode } from '../../features/file-system/contracts/file-system.error.js';
import type { RunErrorCode } from '../../features/run/contracts/run.errors.js';
import type { WorkspaceErrorCode } from '../../features/workspace/contracts/workspace.errors.js';

export const ProjectApplicationErrorCode = {
  notFound: 'PROJECT_NOT_FOUND',
  notActive: 'PROJECT_NOT_ACTIVE',
  notArchived: 'PROJECT_NOT_ARCHIVED',
  nameRequired: 'PROJECT_NAME_REQUIRED',
  descriptionInvalid: 'PROJECT_DESCRIPTION_INVALID',
  recordNotFound: 'PROJECT_RECORD_NOT_FOUND',
  hasActiveRuns: 'PROJECT_HAS_ACTIVE_RUNS',
} as const;

export const ProjectPublicMessage = {
  notFound: 'Project was not found.',
  notActive: 'Project is not active.',
  notArchived: 'Project is not archived.',
  recordNotFound: 'Record was not found.',
  updateBodyInvalid: 'Project update body is required and must be a JSON object.',
  nameRequired: 'Name is required.',
  descriptionInvalid: 'Description must be a string.',
  recordIdRequired: 'Record id is required.',
} as const;

export type ProjectApplicationErrorCode =
  (typeof ProjectApplicationErrorCode)[keyof typeof ProjectApplicationErrorCode];

export const RunApplicationErrorCode = {
  selectorInvalid: 'run_selector_invalid',
  projectIdInvalid: 'project_id_invalid',
  projectUnavailable: 'project_unavailable',
  projectArchived: 'project_archived',
  catalogDefinitionCorrupt: 'catalog_definition_corrupt',
} as const;

const runManagerCodes = [
  'agent_runtime_unavailable',
  'invalid_list_runs_filter',
  'invalid_create_run_input',
  'invalid_run_id',
  'invalid_run_event_page_input',
  'invalid_run_event_subscription_input',
  'invalid_wait_for_terminal_input',
  'manager_not_started',
  'manager_start_failed',
  'manager_stop_failed',
  'pipeline_compilation_failed',
  'run_admission_failed',
  'run_event_cursor_invalid',
  'run_event_subscription_failed',
  'run_gate_already_resolved',
  'run_gate_answer_invalid',
  'run_gate_not_found',
  'run_gate_payload_invalid',
  'run_gate_unauthorized',
  'run_id_conflict',
  'run_interaction_failed',
  'run_not_found',
  'run_profile_invalid',
  'run_read_failed',
  'run_recovery_required',
  'run_requirement_unresolved',
  'run_signal_invalid',
  'run_signal_payload_invalid',
  'run_wait_aborted',
  'run_wait_already_resolved',
  'run_wait_not_found',
  'run_wait_timed_out',
] as const satisfies readonly RunErrorCode[];

export type RunManagerApplicationErrorCode = Exclude<
  RunErrorCode,
  (typeof RunApplicationErrorCode)[keyof typeof RunApplicationErrorCode]
>;
export type ApplicationErrorCode =
  | ProjectApplicationErrorCode
  | WorkspaceErrorCode
  | FileSystemErrorCode
  | AgentDefinitionsErrorCode
  | (typeof RunApplicationErrorCode)[keyof typeof RunApplicationErrorCode]
  | RunManagerApplicationErrorCode;

type Definition = Readonly<{
  status: number;
  message: string;
  publicCode?: string;
  description?: string;
  graphqlMessage: boolean;
  graphqlLean?: boolean;
  graphqlOrdinary?: boolean;
  restError?: string;
}>;

const definition = (
  status: number,
  message: string,
  options: Omit<Definition, 'status' | 'message' | 'graphqlMessage'> & {
    graphqlMessage?: boolean;
  } = {},
): Definition => ({ status, message, graphqlMessage: true, ...options });

const runDefinitions: Record<string, Definition> = Object.fromEntries(
  runManagerCodes.map((code) => [code, definitionForRun(code)]),
);

export const publicErrorDefinitions = {
  PROJECT_NOT_FOUND: definition(404, 'Project was not found.', {
    graphqlOrdinary: true,
    restError: 'Not Found',
  }),
  PROJECT_NOT_ACTIVE: definition(409, 'Project is not active.', {
    graphqlOrdinary: true,
    restError: 'Conflict',
  }),
  PROJECT_NOT_ARCHIVED: definition(409, 'Project is not archived.', {
    graphqlOrdinary: true,
    restError: 'Conflict',
  }),
  PROJECT_NAME_REQUIRED: definition(400, 'Name is required.', {
    publicCode: 'INVALID_REQUEST',
    graphqlOrdinary: true,
    restError: 'Bad Request',
  }),
  PROJECT_DESCRIPTION_INVALID: definition(400, 'Description must be a string.', {
    publicCode: 'INVALID_REQUEST',
    graphqlOrdinary: true,
    restError: 'Bad Request',
  }),
  PROJECT_RECORD_NOT_FOUND: definition(404, 'Record was not found.', {
    graphqlOrdinary: true,
    restError: 'Not Found',
  }),
  PROJECT_HAS_ACTIVE_RUNS: definition(409, 'Project has active runs.', {
    publicCode: 'project_has_active_runs',
    description: 'Stop or finish the active runs before archiving the project.',
  }),
  WORKSPACE_NOT_FOUND: definition(404, 'Workspace was not found in this Project.', {
    publicCode: 'WORKSPACE_NOT_FOUND',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  WORKSPACE_PROJECT_NOT_FOUND: definition(404, 'Project was not found.', {
    publicCode: 'WORKSPACE_PROJECT_NOT_FOUND',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  WORKSPACE_PROJECT_ARCHIVED: definition(409, 'Workspace changes require an active Project.', {
    publicCode: 'WORKSPACE_PROJECT_ARCHIVED',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  WORKSPACE_ARCHIVED: definition(409, 'Workspace is archived.', {
    publicCode: 'WORKSPACE_ARCHIVED',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  WORKSPACE_INVALID_INPUT: definition(400, 'Workspace input is invalid.', {
    publicCode: 'WORKSPACE_INVALID_INPUT',
  }),
  FILE_SYSTEM_NOT_FOUND: definition(404, 'Filesystem entry was not found.', {
    publicCode: 'FILE_SYSTEM_NOT_FOUND',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  FILE_SYSTEM_NOT_DIRECTORY: definition(400, 'Filesystem entry is not a directory.', {
    publicCode: 'FILE_SYSTEM_NOT_DIRECTORY',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  FILE_SYSTEM_ACCESS_DENIED: definition(403, 'The operating system denied filesystem access.', {
    publicCode: 'FILE_SYSTEM_ACCESS_DENIED',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  FILE_SYSTEM_ALREADY_EXISTS: definition(409, 'Filesystem entry already exists.', {
    publicCode: 'FILE_SYSTEM_ALREADY_EXISTS',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  FILE_SYSTEM_INVALID_PATH: definition(400, 'Filesystem path is invalid.', {
    publicCode: 'FILE_SYSTEM_INVALID_PATH',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  FILE_SYSTEM_INVALID_NAME: definition(400, 'Directory name is invalid.', {
    publicCode: 'FILE_SYSTEM_INVALID_NAME',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  FILE_SYSTEM_TOO_LARGE: definition(413, 'Filesystem text exceeds the supported size.', {
    publicCode: 'FILE_SYSTEM_TOO_LARGE',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  FILE_SYSTEM_IO_ERROR: definition(500, 'Filesystem operation failed.', {
    publicCode: 'FILE_SYSTEM_IO_ERROR',
    graphqlMessage: false,
    graphqlLean: true,
  }),
  REVO_AGENT_SESSION_INVALID_CURSOR: definition(400, 'Agent definition cursor is invalid.', {
    publicCode: 'REVO_AGENT_SESSION_INVALID_CURSOR',
    graphqlMessage: false,
  }),
  REVO_AGENT_SESSION_EXPIRED_CURSOR: definition(
    404,
    'Agent definition cursor belongs to an earlier process.',
    { publicCode: 'REVO_AGENT_SESSION_EXPIRED_CURSOR', graphqlMessage: false },
  ),
  run_selector_invalid: definition(400, 'Exactly one selector is required.', {
    publicCode: 'run_selector_invalid',
  }),
  project_id_invalid: definition(400, 'Project ID is required.', {
    publicCode: 'project_id_invalid',
  }),
  project_unavailable: definition(404, 'Project was not found.', {
    publicCode: 'project_unavailable',
  }),
  project_archived: definition(409, 'Project is not active.', { publicCode: 'project_archived' }),
  catalog_definition_corrupt: definition(409, 'Catalog definition is corrupt.', {
    publicCode: 'catalog_definition_corrupt',
  }),
  ...runDefinitions,
} satisfies Record<Exclude<ApplicationErrorCode, RunManagerApplicationErrorCode>, Definition> &
  Record<string, Definition>;

function definitionForRun(code: RunManagerApplicationErrorCode): Definition {
  const messages: Record<RunManagerApplicationErrorCode, [number, string]> = {
    agent_runtime_unavailable: [503, 'Agent runtime is unavailable.'],
    invalid_list_runs_filter: [400, 'Run-list filter is invalid.'],
    invalid_create_run_input: [400, 'Create-run input is invalid.'],
    invalid_run_id: [400, 'Run ID is invalid.'],
    invalid_run_event_page_input: [400, 'Run-event page input is invalid.'],
    invalid_run_event_subscription_input: [400, 'Run-event subscription input is invalid.'],
    invalid_wait_for_terminal_input: [400, 'Wait-for-terminal input is invalid.'],
    manager_not_started: [503, 'Run manager is not started.'],
    manager_start_failed: [503, 'Run manager failed to start.'],
    manager_stop_failed: [503, 'Run manager failed to stop.'],
    pipeline_compilation_failed: [422, 'Pipeline compilation failed.'],
    run_admission_failed: [503, 'Run admission failed.'],
    run_event_cursor_invalid: [400, 'Run-event cursor is invalid.'],
    run_event_subscription_failed: [503, 'Run-event subscription failed.'],
    run_gate_already_resolved: [409, 'Human gate is already resolved.'],
    run_gate_answer_invalid: [400, 'Human-gate answer is invalid.'],
    run_gate_not_found: [404, 'Pending human gate was not found.'],
    run_gate_payload_invalid: [400, 'Human-gate payload is invalid.'],
    run_gate_unauthorized: [403, 'Actor is not authorized to answer the human gate.'],
    run_id_conflict: [503, 'A run ID could not be allocated.'],
    run_interaction_failed: [503, 'Run interaction could not be committed.'],
    run_not_found: [404, 'Run was not found.'],
    run_profile_invalid: [422, 'Run profile is invalid.'],
    run_read_failed: [503, 'Run observation could not be read.'],
    run_recovery_required: [409, 'Run requires recovery before it can continue.'],
    run_requirement_unresolved: [422, 'A run requirement could not be resolved.'],
    run_signal_invalid: [400, 'Signal name is invalid for the pending wait.'],
    run_signal_payload_invalid: [400, 'Signal payload is invalid.'],
    run_wait_aborted: [503, 'Waiting for the run was aborted.'],
    run_wait_already_resolved: [409, 'Signal wait is already resolved.'],
    run_wait_not_found: [404, 'Pending signal wait was not found.'],
    run_wait_timed_out: [504, 'Waiting for the run timed out.'],
  };
  const [status, message] = messages[code];
  return definition(status, message, {
    publicCode: code === 'run_id_conflict' ? 'RUN_ID_ALLOCATION_CONFLICT' : code,
  });
}
