import { AgentDefinitionsErrorCode } from '../../features/agent-definitions/contracts/agent-definitions.errors.js';
import { FileSystemErrorCode } from '../../features/file-system/contracts/file-system.error.js';
import { CatalogErrorCode } from '../../features/playbook-catalog/contracts/catalog.errors.js';
import { ProjectErrorCode } from '../../features/project/contracts/project.errors.js';
import { RunErrorCode } from '../../features/run/contracts/run.errors.js';
import { WorkspaceErrorCode } from '../../features/workspace/contracts/workspace.errors.js';
import type { KnownApplicationFailure } from './known-application-error.js';

export type ApplicationErrorCode = KnownApplicationFailure['code'];
export type PublicErrorMetadata = Readonly<{
  status: number;
  message: string | Readonly<{ pipeline: string; profile: string }>;
  graphql: 'plain' | 'lean' | 'full';
  publicCode?: string;
  restError?: string;
  description?: string;
}>;

type PublicDefinition<K extends ApplicationErrorCode> = PublicErrorMetadata &
  Readonly<{
    message: K extends typeof RunErrorCode.selectorInvalid
      ? Readonly<{ pipeline: string; profile: string }>
      : string;
  }>;
type PublicDefinitions = { readonly [K in ApplicationErrorCode]: PublicDefinition<K> };

export const publicErrorDefinitions = {
  [ProjectErrorCode.notFound]: {
    status: 404,
    message: 'Project was not found.',
    restError: 'Not Found',
    graphql: 'plain',
  },
  [ProjectErrorCode.notActive]: {
    status: 409,
    message: 'Project is not active.',
    restError: 'Conflict',
    graphql: 'plain',
  },
  [ProjectErrorCode.notArchived]: {
    status: 409,
    message: 'Project is not archived.',
    restError: 'Conflict',
    graphql: 'plain',
  },
  [ProjectErrorCode.nameRequired]: {
    status: 400,
    message: 'Name is required.',
    publicCode: 'INVALID_REQUEST',
    restError: 'Bad Request',
    graphql: 'plain',
  },
  [ProjectErrorCode.descriptionInvalid]: {
    status: 400,
    message: 'Description must be a string.',
    publicCode: 'INVALID_REQUEST',
    restError: 'Bad Request',
    graphql: 'plain',
  },
  [ProjectErrorCode.recordNotFound]: {
    status: 404,
    message: 'Record was not found.',
    restError: 'Not Found',
    graphql: 'plain',
  },
  [ProjectErrorCode.hasActiveRuns]: {
    status: 409,
    message: 'Project has active runs.',
    publicCode: 'project_has_active_runs',
    description:
      'Stop or finish active runs and allow pending run reservations to resolve before archiving the project.',
    graphql: 'full',
  },
  [WorkspaceErrorCode.notFound]: {
    status: 404,
    message: 'Workspace was not found in this Project.',
    publicCode: WorkspaceErrorCode.notFound,
    graphql: 'lean',
  },
  [WorkspaceErrorCode.projectNotFound]: {
    status: 404,
    message: 'Project was not found.',
    publicCode: WorkspaceErrorCode.projectNotFound,
    graphql: 'lean',
  },
  [WorkspaceErrorCode.projectArchived]: {
    status: 409,
    message: 'Workspace changes require an active Project.',
    publicCode: WorkspaceErrorCode.projectArchived,
    graphql: 'lean',
  },
  [WorkspaceErrorCode.archived]: {
    status: 409,
    message: 'Workspace is archived.',
    publicCode: WorkspaceErrorCode.archived,
    graphql: 'lean',
  },
  [WorkspaceErrorCode.invalidInput]: {
    status: 400,
    message: 'Workspace input is invalid.',
    publicCode: WorkspaceErrorCode.invalidInput,
    graphql: 'lean',
  },
  [FileSystemErrorCode.notFound]: {
    status: 404,
    message: 'Filesystem entry was not found.',
    publicCode: FileSystemErrorCode.notFound,
    graphql: 'lean',
  },
  [FileSystemErrorCode.notDirectory]: {
    status: 400,
    message: 'Filesystem entry is not a directory.',
    publicCode: FileSystemErrorCode.notDirectory,
    graphql: 'lean',
  },
  [FileSystemErrorCode.accessDenied]: {
    status: 403,
    message: 'The operating system denied filesystem access.',
    publicCode: FileSystemErrorCode.accessDenied,
    graphql: 'lean',
  },
  [FileSystemErrorCode.alreadyExists]: {
    status: 409,
    message: 'Filesystem entry already exists.',
    publicCode: FileSystemErrorCode.alreadyExists,
    graphql: 'lean',
  },
  [FileSystemErrorCode.invalidPath]: {
    status: 400,
    message: 'Filesystem path is invalid.',
    publicCode: FileSystemErrorCode.invalidPath,
    graphql: 'lean',
  },
  [FileSystemErrorCode.invalidName]: {
    status: 400,
    message: 'Directory name is invalid.',
    publicCode: FileSystemErrorCode.invalidName,
    graphql: 'lean',
  },
  [FileSystemErrorCode.tooLarge]: {
    status: 413,
    message: 'Filesystem text exceeds the supported size.',
    publicCode: FileSystemErrorCode.tooLarge,
    graphql: 'lean',
  },
  [FileSystemErrorCode.ioError]: {
    status: 500,
    message: 'Filesystem operation failed.',
    publicCode: FileSystemErrorCode.ioError,
    graphql: 'lean',
  },
  [AgentDefinitionsErrorCode.invalidCursor]: {
    status: 400,
    message: 'Agent definition cursor is invalid.',
    publicCode: AgentDefinitionsErrorCode.invalidCursor,
    graphql: 'lean',
  },
  [AgentDefinitionsErrorCode.expiredCursor]: {
    status: 404,
    message: 'Agent definition cursor belongs to an earlier process.',
    publicCode: AgentDefinitionsErrorCode.expiredCursor,
    graphql: 'lean',
  },
  [CatalogErrorCode.definitionCorrupt]: {
    status: 409,
    message: 'Catalog definition is corrupt.',
    publicCode: CatalogErrorCode.definitionCorrupt,
    graphql: 'full',
  },
  [RunErrorCode.selectorInvalid]: {
    status: 400,
    message: {
      pipeline: 'Exactly one pipeline selector is required.',
      profile: 'Exactly one profile selector is required.',
    },
    publicCode: RunErrorCode.selectorInvalid,
    graphql: 'full',
  },
  [RunErrorCode.projectIdInvalid]: {
    status: 400,
    message: 'Project ID is required.',
    publicCode: RunErrorCode.projectIdInvalid,
    graphql: 'full',
  },
  [RunErrorCode.projectUnavailable]: {
    status: 404,
    message: 'Project was not found.',
    publicCode: RunErrorCode.projectUnavailable,
    graphql: 'full',
  },
  [RunErrorCode.projectArchived]: {
    status: 409,
    message: 'Project is not active.',
    publicCode: RunErrorCode.projectArchived,
    graphql: 'full',
  },
  [RunErrorCode.agentRuntimeUnavailable]: {
    status: 503,
    message: 'Agent runtime is unavailable.',
    publicCode: RunErrorCode.agentRuntimeUnavailable,
    graphql: 'full',
  },
  [RunErrorCode.invalidListRunsFilter]: {
    status: 400,
    message: 'Run-list filter is invalid.',
    publicCode: RunErrorCode.invalidListRunsFilter,
    graphql: 'full',
  },
  [RunErrorCode.invalidCreateRunInput]: {
    status: 400,
    message: 'Create-run input is invalid.',
    publicCode: RunErrorCode.invalidCreateRunInput,
    graphql: 'full',
  },
  [RunErrorCode.invalidRunId]: {
    status: 400,
    message: 'Run ID is invalid.',
    publicCode: RunErrorCode.invalidRunId,
    graphql: 'full',
  },
  [RunErrorCode.invalidRunEventPageInput]: {
    status: 400,
    message: 'Run-event page input is invalid.',
    publicCode: RunErrorCode.invalidRunEventPageInput,
    graphql: 'full',
  },
  [RunErrorCode.invalidRunEventSubscriptionInput]: {
    status: 400,
    message: 'Run-event subscription input is invalid.',
    publicCode: RunErrorCode.invalidRunEventSubscriptionInput,
    graphql: 'full',
  },
  [RunErrorCode.invalidWaitForTerminalInput]: {
    status: 400,
    message: 'Wait-for-terminal input is invalid.',
    publicCode: RunErrorCode.invalidWaitForTerminalInput,
    graphql: 'full',
  },
  [RunErrorCode.managerNotStarted]: {
    status: 503,
    message: 'Run manager is not started.',
    publicCode: RunErrorCode.managerNotStarted,
    graphql: 'full',
  },
  [RunErrorCode.managerStartFailed]: {
    status: 503,
    message: 'Run manager failed to start.',
    publicCode: RunErrorCode.managerStartFailed,
    graphql: 'full',
  },
  [RunErrorCode.managerStopFailed]: {
    status: 503,
    message: 'Run manager failed to stop.',
    publicCode: RunErrorCode.managerStopFailed,
    graphql: 'full',
  },
  [RunErrorCode.pipelineCompilationFailed]: {
    status: 422,
    message: 'Pipeline compilation failed.',
    publicCode: RunErrorCode.pipelineCompilationFailed,
    graphql: 'full',
  },
  [RunErrorCode.runAdmissionFailed]: {
    status: 503,
    message: 'Run admission failed.',
    publicCode: RunErrorCode.runAdmissionFailed,
    graphql: 'full',
  },
  [RunErrorCode.runEventCursorInvalid]: {
    status: 400,
    message: 'Run-event cursor is invalid.',
    publicCode: RunErrorCode.runEventCursorInvalid,
    graphql: 'full',
  },
  [RunErrorCode.runEventSubscriptionFailed]: {
    status: 503,
    message: 'Run-event subscription failed.',
    publicCode: RunErrorCode.runEventSubscriptionFailed,
    graphql: 'full',
  },
  [RunErrorCode.runGateAlreadyResolved]: {
    status: 409,
    message: 'Human gate is already resolved.',
    publicCode: RunErrorCode.runGateAlreadyResolved,
    graphql: 'full',
  },
  [RunErrorCode.runGateAnswerInvalid]: {
    status: 400,
    message: 'Human-gate answer is invalid.',
    publicCode: RunErrorCode.runGateAnswerInvalid,
    graphql: 'full',
  },
  [RunErrorCode.runGateNotFound]: {
    status: 404,
    message: 'Pending human gate was not found.',
    publicCode: RunErrorCode.runGateNotFound,
    graphql: 'full',
  },
  [RunErrorCode.runGatePayloadInvalid]: {
    status: 400,
    message: 'Human-gate payload is invalid.',
    publicCode: RunErrorCode.runGatePayloadInvalid,
    graphql: 'full',
  },
  [RunErrorCode.runGateUnauthorized]: {
    status: 403,
    message: 'Actor is not authorized to answer the human gate.',
    publicCode: RunErrorCode.runGateUnauthorized,
    graphql: 'full',
  },
  [RunErrorCode.runIdConflict]: {
    status: 503,
    message: 'A run ID could not be allocated.',
    publicCode: 'RUN_ID_ALLOCATION_CONFLICT',
    graphql: 'full',
  },
  [RunErrorCode.runInteractionFailed]: {
    status: 503,
    message: 'Run interaction could not be committed.',
    publicCode: RunErrorCode.runInteractionFailed,
    graphql: 'full',
  },
  [RunErrorCode.runNotFound]: {
    status: 404,
    message: 'Run was not found.',
    publicCode: RunErrorCode.runNotFound,
    graphql: 'full',
  },
  [RunErrorCode.runProfileInvalid]: {
    status: 422,
    message: 'Run profile is invalid.',
    publicCode: RunErrorCode.runProfileInvalid,
    graphql: 'full',
  },
  [RunErrorCode.runReadFailed]: {
    status: 503,
    message: 'Run observation could not be read.',
    publicCode: RunErrorCode.runReadFailed,
    graphql: 'full',
  },
  [RunErrorCode.runRecoveryRequired]: {
    status: 409,
    message: 'Run requires recovery before it can continue.',
    publicCode: RunErrorCode.runRecoveryRequired,
    graphql: 'full',
  },
  [RunErrorCode.runRequirementUnresolved]: {
    status: 422,
    message: 'A run requirement could not be resolved.',
    publicCode: RunErrorCode.runRequirementUnresolved,
    graphql: 'full',
  },
  [RunErrorCode.runSignalInvalid]: {
    status: 400,
    message: 'Signal name is invalid for the pending wait.',
    publicCode: RunErrorCode.runSignalInvalid,
    graphql: 'full',
  },
  [RunErrorCode.runSignalPayloadInvalid]: {
    status: 400,
    message: 'Signal payload is invalid.',
    publicCode: RunErrorCode.runSignalPayloadInvalid,
    graphql: 'full',
  },
  [RunErrorCode.runWaitAborted]: {
    status: 503,
    message: 'Waiting for the run was aborted.',
    publicCode: RunErrorCode.runWaitAborted,
    graphql: 'full',
  },
  [RunErrorCode.runWaitAlreadyResolved]: {
    status: 409,
    message: 'Signal wait is already resolved.',
    publicCode: RunErrorCode.runWaitAlreadyResolved,
    graphql: 'full',
  },
  [RunErrorCode.runWaitNotFound]: {
    status: 404,
    message: 'Pending signal wait was not found.',
    publicCode: RunErrorCode.runWaitNotFound,
    graphql: 'full',
  },
  [RunErrorCode.runWaitTimedOut]: {
    status: 504,
    message: 'Waiting for the run timed out.',
    publicCode: RunErrorCode.runWaitTimedOut,
    graphql: 'full',
  },
} satisfies PublicDefinitions;
