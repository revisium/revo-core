import { AgentDefinitionsErrorCode } from '../../features/agent-definitions/contracts/agent-definitions.errors.js';
import { FileSystemErrorCode } from '../../features/file-system/contracts/file-system.error.js';
import { CatalogErrorCode } from '../../features/playbook-catalog/contracts/catalog.errors.js';
import { ProjectErrorCode } from '../../features/project/contracts/project.errors.js';
import { RunErrorCode } from '../../features/run/contracts/run.errors.js';
import { WorkspaceErrorCode } from '../../features/workspace/contracts/workspace.errors.js';
import type { KnownApplicationFailure } from './known-application-error.js';

type SafeDetails =
  | Record<string, never>
  | { readonly runIds: readonly string[] }
  | { readonly reason: string }
  | { readonly lifecycle: string }
  | { readonly operation: string }
  | { readonly runId: string; readonly reason?: string }
  | { readonly runId: string; readonly gateId: string }
  | { readonly runId: string; readonly waitId: string; readonly path?: string | null }
  | { readonly runId: string | null; readonly operation: string }
  | {
      readonly runId: string;
      readonly attempts: readonly { operationId: string; attemptId: string }[];
    }
  | { readonly requirementKey: string; readonly bindingKey: string | null; readonly reason: string }
  | { readonly runId: string; readonly timeoutMs: number }
  | {
      readonly diagnostics: readonly {
        family: string;
        code: string;
        path: string;
        message: string;
      }[];
    }
  | { readonly field: string };

export type PublicErrorPayload = Readonly<{
  path?: string | null;
  field?: string;
  details?: SafeDetails;
}>;

export function publicErrorPayload(failure: KnownApplicationFailure): PublicErrorPayload {
  switch (failure.code) {
    case ProjectErrorCode.notFound:
    case ProjectErrorCode.notActive:
    case ProjectErrorCode.notArchived:
    case ProjectErrorCode.nameRequired:
    case ProjectErrorCode.descriptionInvalid:
    case ProjectErrorCode.recordNotFound:
      return {};
    case ProjectErrorCode.hasActiveRuns:
      return { path: '/projectId', details: { runIds: [...failure.details.runIds] } };
    case WorkspaceErrorCode.notFound:
    case WorkspaceErrorCode.projectNotFound:
    case WorkspaceErrorCode.projectArchived:
    case WorkspaceErrorCode.archived:
      return {};
    case WorkspaceErrorCode.invalidInput:
      return failure.details.field === undefined ? {} : { field: failure.details.field };
    case FileSystemErrorCode.notFound:
    case FileSystemErrorCode.notDirectory:
    case FileSystemErrorCode.accessDenied:
    case FileSystemErrorCode.alreadyExists:
    case FileSystemErrorCode.invalidPath:
    case FileSystemErrorCode.invalidName:
    case FileSystemErrorCode.tooLarge:
    case FileSystemErrorCode.ioError:
      return {};
    case AgentDefinitionsErrorCode.invalidCursor:
    case AgentDefinitionsErrorCode.expiredCursor:
      return { path: null };
    case CatalogErrorCode.definitionCorrupt:
      return { path: `/${failure.details.field}`, details: { reason: 'storage_json' } };
    case RunErrorCode.selectorInvalid:
      return {
        path: failure.details.selector === 'pipeline' ? '/pipeline' : '/profile',
        details: { reason: failure.details.reason },
      };
    case RunErrorCode.projectIdInvalid:
      return { path: '/projectId', details: { reason: 'required' } };
    case RunErrorCode.projectUnavailable:
    case RunErrorCode.projectArchived:
      return { path: '/projectId', details: {} };
    case RunErrorCode.agentRuntimeUnavailable:
    case RunErrorCode.runIdConflict:
      return { path: null, details: {} };
    case RunErrorCode.invalidListRunsFilter:
    case RunErrorCode.invalidCreateRunInput:
    case RunErrorCode.invalidRunId:
    case RunErrorCode.invalidRunEventPageInput:
    case RunErrorCode.invalidRunEventSubscriptionInput:
    case RunErrorCode.invalidWaitForTerminalInput:
    case RunErrorCode.runProfileInvalid:
      return { path: failure.details.path, details: { reason: failure.details.reason } };
    case RunErrorCode.managerNotStarted:
      return { path: null, details: { lifecycle: failure.details.lifecycle } };
    case RunErrorCode.managerStartFailed:
    case RunErrorCode.managerStopFailed:
    case RunErrorCode.runAdmissionFailed:
      return { path: null, details: { operation: failure.details.operation } };
    case RunErrorCode.pipelineCompilationFailed:
      return {
        path: null,
        details: {
          diagnostics: failure.details.diagnostics.map((diagnostic) => ({
            family: diagnostic.family,
            code: diagnostic.code,
            path: diagnostic.path,
            message: diagnostic.message,
          })),
        },
      };
    case RunErrorCode.runEventCursorInvalid:
      return {
        path: null,
        details: { runId: failure.details.runId, reason: failure.details.reason },
      };
    case RunErrorCode.runEventSubscriptionFailed:
    case RunErrorCode.runNotFound:
    case RunErrorCode.runWaitAborted:
      return { path: null, details: { runId: failure.details.runId } };
    case RunErrorCode.runGateAlreadyResolved:
    case RunErrorCode.runGateAnswerInvalid:
    case RunErrorCode.runGateNotFound:
    case RunErrorCode.runGatePayloadInvalid:
    case RunErrorCode.runGateUnauthorized:
      return {
        path: failure.details.path,
        details: { runId: failure.details.runId, gateId: failure.details.gateId },
      };
    case RunErrorCode.runInteractionFailed:
    case RunErrorCode.runReadFailed:
      return {
        path: null,
        details: { runId: failure.details.runId, operation: failure.details.operation },
      };
    case RunErrorCode.runRecoveryRequired:
      return {
        path: null,
        details: {
          runId: failure.details.runId,
          attempts: failure.details.attempts.map((attempt) => ({
            operationId: attempt.operationId,
            attemptId: attempt.attemptId,
          })),
        },
      };
    case RunErrorCode.runRequirementUnresolved:
      return {
        path: null,
        details: {
          requirementKey: failure.details.requirementKey,
          bindingKey: failure.details.bindingKey,
          reason: failure.details.reason,
        },
      };
    case RunErrorCode.runSignalInvalid:
    case RunErrorCode.runSignalPayloadInvalid:
    case RunErrorCode.runWaitAlreadyResolved:
    case RunErrorCode.runWaitNotFound:
      return {
        path: failure.details.path,
        details: { runId: failure.details.runId, waitId: failure.details.waitId },
      };
    case RunErrorCode.runWaitTimedOut:
      return {
        path: null,
        details: { runId: failure.details.runId, timeoutMs: failure.details.timeoutMs },
      };
  }

  return assertNever(failure);
}

function assertNever(value: never): never {
  throw new Error(`Unsupported application failure: ${String(value)}`);
}
