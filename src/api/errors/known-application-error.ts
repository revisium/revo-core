import {
  AgentDefinitionsApplicationError,
  type AgentDefinitionsFailure,
} from '../../features/agent-definitions/contracts/agent-definitions.errors.js';
import {
  FileSystemError,
  type FileSystemFailure,
} from '../../features/file-system/contracts/file-system.error.js';
import {
  CatalogDefinitionCorruptError,
  type CatalogDefinitionCorruptFailure,
} from '../../features/playbook-catalog/contracts/catalog.errors.js';
import {
  ProjectApplicationError,
  type ProjectFailure,
} from '../../features/project/contracts/project.errors.js';
import { RunApplicationError, type RunFailure } from '../../features/run/contracts/run.errors.js';
import {
  WorkspaceError,
  type WorkspaceFailure,
} from '../../features/workspace/contracts/workspace.errors.js';

export type KnownApplicationFailure =
  | ProjectFailure
  | RunFailure
  | WorkspaceFailure
  | FileSystemFailure
  | AgentDefinitionsFailure
  | CatalogDefinitionCorruptFailure;

export function knownApplicationFailure(error: unknown): KnownApplicationFailure | undefined {
  if (
    error instanceof ProjectApplicationError ||
    error instanceof RunApplicationError ||
    error instanceof WorkspaceError ||
    error instanceof FileSystemError ||
    error instanceof AgentDefinitionsApplicationError ||
    error instanceof CatalogDefinitionCorruptError
  ) {
    return error.failure;
  }

  return undefined;
}
