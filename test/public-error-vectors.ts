import { NotFoundException } from '@nestjs/common';
import { RunManagerError } from '@revisium/revo-run';

import { AgentDefinitionsApplicationError } from '../src/features/agent-definitions/contracts/agent-definitions.errors.js';
import { FileSystemError } from '../src/features/file-system/contracts/file-system.error.js';
import { CatalogDefinitionCorruptError } from '../src/features/playbook-catalog/contracts/catalog.errors.js';
import {
  decodePipelineRecordData,
  decodeLaunchProfileRecordData,
} from '../src/features/playbook-catalog/engine/catalog-record.codec.js';
import { ProjectApplicationError } from '../src/features/project/contracts/project.errors.js';
import { RunApplicationError } from '../src/features/run/contracts/run.errors.js';
import { rethrowCatalogReadError } from '../src/features/run/engine/catalog-error.mapper.js';
import { rethrowPublicRunError } from '../src/features/run/engine/run-manager-error.mapper.js';
import { WorkspaceError } from '../src/features/workspace/contracts/workspace.errors.js';

type PublicErrorVector = {
  name: string;
  error: () => unknown;
  rest: { statusCode: number; message: string; [key: string]: unknown };
  graphql: Record<string, unknown> | undefined;
};

// Literal wire contracts pinned to 87419c7; active-run description is the approved addition.
// AgentDefinitions HTTP vectors exercise only this fixture, not a production REST endpoint.
export const publicErrorVectors: readonly PublicErrorVector[] = [
  {
    name: 'PROJECT_NOT_FOUND',
    error: () => new ProjectApplicationError({ code: 'PROJECT_NOT_FOUND', details: {} }),
    rest: { statusCode: 404, message: 'Project was not found.', error: 'Not Found' },
    graphql: undefined,
  },
  {
    name: 'PROJECT_NOT_ACTIVE',
    error: () => new ProjectApplicationError({ code: 'PROJECT_NOT_ACTIVE', details: {} }),
    rest: { statusCode: 409, message: 'Project is not active.', error: 'Conflict' },
    graphql: undefined,
  },
  {
    name: 'PROJECT_NOT_ARCHIVED',
    error: () => new ProjectApplicationError({ code: 'PROJECT_NOT_ARCHIVED', details: {} }),
    rest: { statusCode: 409, message: 'Project is not archived.', error: 'Conflict' },
    graphql: undefined,
  },
  {
    name: 'PROJECT_NAME_REQUIRED',
    error: () => new ProjectApplicationError({ code: 'PROJECT_NAME_REQUIRED', details: {} }),
    rest: {
      statusCode: 400,
      message: 'Name is required.',
      error: 'Bad Request',
      code: 'INVALID_REQUEST',
    },
    graphql: undefined,
  },
  {
    name: 'PROJECT_DESCRIPTION_INVALID',
    error: () => new ProjectApplicationError({ code: 'PROJECT_DESCRIPTION_INVALID', details: {} }),
    rest: {
      statusCode: 400,
      message: 'Description must be a string.',
      error: 'Bad Request',
      code: 'INVALID_REQUEST',
    },
    graphql: undefined,
  },
  {
    name: 'PROJECT_RECORD_NOT_FOUND',
    error: () => new ProjectApplicationError({ code: 'PROJECT_RECORD_NOT_FOUND', details: {} }),
    rest: { statusCode: 404, message: 'Record was not found.', error: 'Not Found' },
    graphql: undefined,
  },
  {
    name: 'project_has_active_runs',
    error: () =>
      new ProjectApplicationError({
        code: 'project_has_active_runs',
        details: { runIds: ['r2', 'r1'] },
      }),
    rest: {
      statusCode: 409,
      code: 'project_has_active_runs',
      message: 'Project has active runs.',
      description:
        'Stop or finish active runs and allow pending run reservations to resolve before archiving the project.',
      path: '/projectId',
      details: { runIds: ['r2', 'r1'] },
    },
    graphql: {
      statusCode: 409,
      code: 'project_has_active_runs',
      message: 'Project has active runs.',
      description:
        'Stop or finish active runs and allow pending run reservations to resolve before archiving the project.',
      path: '/projectId',
      details: { runIds: ['r2', 'r1'] },
    },
  },
  {
    name: 'WORKSPACE_NOT_FOUND',
    error: () => new WorkspaceError({ code: 'WORKSPACE_NOT_FOUND', details: {} }),
    rest: {
      statusCode: 404,
      code: 'WORKSPACE_NOT_FOUND',
      message: 'Workspace was not found in this Project.',
    },
    graphql: { statusCode: 404, code: 'WORKSPACE_NOT_FOUND' },
  },
  {
    name: 'WORKSPACE_PROJECT_NOT_FOUND',
    error: () => new WorkspaceError({ code: 'WORKSPACE_PROJECT_NOT_FOUND', details: {} }),
    rest: {
      statusCode: 404,
      code: 'WORKSPACE_PROJECT_NOT_FOUND',
      message: 'Project was not found.',
    },
    graphql: { statusCode: 404, code: 'WORKSPACE_PROJECT_NOT_FOUND' },
  },
  {
    name: 'WORKSPACE_PROJECT_ARCHIVED',
    error: () => new WorkspaceError({ code: 'WORKSPACE_PROJECT_ARCHIVED', details: {} }),
    rest: {
      statusCode: 409,
      code: 'WORKSPACE_PROJECT_ARCHIVED',
      message: 'Workspace changes require an active Project.',
    },
    graphql: { statusCode: 409, code: 'WORKSPACE_PROJECT_ARCHIVED' },
  },
  {
    name: 'WORKSPACE_ARCHIVED',
    error: () => new WorkspaceError({ code: 'WORKSPACE_ARCHIVED', details: {} }),
    rest: { statusCode: 409, code: 'WORKSPACE_ARCHIVED', message: 'Workspace is archived.' },
    graphql: { statusCode: 409, code: 'WORKSPACE_ARCHIVED' },
  },
  {
    name: 'FILE_SYSTEM_NOT_FOUND',
    error: () => new FileSystemError({ code: 'FILE_SYSTEM_NOT_FOUND', details: {} }),
    rest: {
      statusCode: 404,
      code: 'FILE_SYSTEM_NOT_FOUND',
      message: 'Filesystem entry was not found.',
    },
    graphql: { statusCode: 404, code: 'FILE_SYSTEM_NOT_FOUND' },
  },
  {
    name: 'FILE_SYSTEM_NOT_DIRECTORY',
    error: () => new FileSystemError({ code: 'FILE_SYSTEM_NOT_DIRECTORY', details: {} }),
    rest: {
      statusCode: 400,
      code: 'FILE_SYSTEM_NOT_DIRECTORY',
      message: 'Filesystem entry is not a directory.',
    },
    graphql: { statusCode: 400, code: 'FILE_SYSTEM_NOT_DIRECTORY' },
  },
  {
    name: 'FILE_SYSTEM_ACCESS_DENIED',
    error: () => new FileSystemError({ code: 'FILE_SYSTEM_ACCESS_DENIED', details: {} }),
    rest: {
      statusCode: 403,
      code: 'FILE_SYSTEM_ACCESS_DENIED',
      message: 'The operating system denied filesystem access.',
    },
    graphql: { statusCode: 403, code: 'FILE_SYSTEM_ACCESS_DENIED' },
  },
  {
    name: 'FILE_SYSTEM_ALREADY_EXISTS',
    error: () => new FileSystemError({ code: 'FILE_SYSTEM_ALREADY_EXISTS', details: {} }),
    rest: {
      statusCode: 409,
      code: 'FILE_SYSTEM_ALREADY_EXISTS',
      message: 'Filesystem entry already exists.',
    },
    graphql: { statusCode: 409, code: 'FILE_SYSTEM_ALREADY_EXISTS' },
  },
  {
    name: 'FILE_SYSTEM_INVALID_PATH',
    error: () => new FileSystemError({ code: 'FILE_SYSTEM_INVALID_PATH', details: {} }),
    rest: {
      statusCode: 400,
      code: 'FILE_SYSTEM_INVALID_PATH',
      message: 'Filesystem path is invalid.',
    },
    graphql: { statusCode: 400, code: 'FILE_SYSTEM_INVALID_PATH' },
  },
  {
    name: 'FILE_SYSTEM_INVALID_NAME',
    error: () => new FileSystemError({ code: 'FILE_SYSTEM_INVALID_NAME', details: {} }),
    rest: {
      statusCode: 400,
      code: 'FILE_SYSTEM_INVALID_NAME',
      message: 'Directory name is invalid.',
    },
    graphql: { statusCode: 400, code: 'FILE_SYSTEM_INVALID_NAME' },
  },
  {
    name: 'FILE_SYSTEM_TOO_LARGE',
    error: () => new FileSystemError({ code: 'FILE_SYSTEM_TOO_LARGE', details: {} }),
    rest: {
      statusCode: 413,
      code: 'FILE_SYSTEM_TOO_LARGE',
      message: 'Filesystem text exceeds the supported size.',
    },
    graphql: { statusCode: 413, code: 'FILE_SYSTEM_TOO_LARGE' },
  },
  {
    name: 'FILE_SYSTEM_IO_ERROR',
    error: () => new FileSystemError({ code: 'FILE_SYSTEM_IO_ERROR', details: {} }),
    rest: {
      statusCode: 500,
      code: 'FILE_SYSTEM_IO_ERROR',
      message: 'Filesystem operation failed.',
    },
    graphql: { statusCode: 500, code: 'FILE_SYSTEM_IO_ERROR' },
  },
  {
    name: 'Workspace field None',
    error: () => new WorkspaceError({ code: 'WORKSPACE_INVALID_INPUT', details: {} }),
    rest: {
      statusCode: 400,
      code: 'WORKSPACE_INVALID_INPUT',
      message: 'Workspace input is invalid.',
    },
    graphql: { statusCode: 400, code: 'WORKSPACE_INVALID_INPUT' },
  },
  {
    name: 'Workspace field name',
    error: () =>
      new WorkspaceError({ code: 'WORKSPACE_INVALID_INPUT', details: { field: 'name' } }),
    rest: {
      statusCode: 400,
      code: 'WORKSPACE_INVALID_INPUT',
      message: 'Workspace input is invalid.',
      field: 'name',
    },
    graphql: { statusCode: 400, code: 'WORKSPACE_INVALID_INPUT', field: 'name' },
  },
  {
    name: 'Workspace field description',
    error: () =>
      new WorkspaceError({ code: 'WORKSPACE_INVALID_INPUT', details: { field: 'description' } }),
    rest: {
      statusCode: 400,
      code: 'WORKSPACE_INVALID_INPUT',
      message: 'Workspace input is invalid.',
      field: 'description',
    },
    graphql: { statusCode: 400, code: 'WORKSPACE_INVALID_INPUT', field: 'description' },
  },
  {
    name: 'Workspace field type',
    error: () =>
      new WorkspaceError({ code: 'WORKSPACE_INVALID_INPUT', details: { field: 'type' } }),
    rest: {
      statusCode: 400,
      code: 'WORKSPACE_INVALID_INPUT',
      message: 'Workspace input is invalid.',
      field: 'type',
    },
    graphql: { statusCode: 400, code: 'WORKSPACE_INVALID_INPUT', field: 'type' },
  },
  {
    name: 'Workspace field sourcePath',
    error: () =>
      new WorkspaceError({ code: 'WORKSPACE_INVALID_INPUT', details: { field: 'sourcePath' } }),
    rest: {
      statusCode: 400,
      code: 'WORKSPACE_INVALID_INPUT',
      message: 'Workspace input is invalid.',
      field: 'sourcePath',
    },
    graphql: { statusCode: 400, code: 'WORKSPACE_INVALID_INPUT', field: 'sourcePath' },
  },
  {
    name: 'Workspace field includeArchived',
    error: () =>
      new WorkspaceError({
        code: 'WORKSPACE_INVALID_INPUT',
        details: { field: 'includeArchived' },
      }),
    rest: {
      statusCode: 400,
      code: 'WORKSPACE_INVALID_INPUT',
      message: 'Workspace input is invalid.',
      field: 'includeArchived',
    },
    graphql: { statusCode: 400, code: 'WORKSPACE_INVALID_INPUT', field: 'includeArchived' },
  },
  {
    name: 'REVO_AGENT_SESSION_INVALID_CURSOR',
    error: () =>
      new AgentDefinitionsApplicationError({
        code: 'REVO_AGENT_SESSION_INVALID_CURSOR',
        details: {},
      }),
    rest: {
      statusCode: 400,
      code: 'REVO_AGENT_SESSION_INVALID_CURSOR',
      message: 'Agent definition cursor is invalid.',
      path: null,
    },
    graphql: { statusCode: 400, code: 'REVO_AGENT_SESSION_INVALID_CURSOR', path: null },
  },
  {
    name: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
    error: () =>
      new AgentDefinitionsApplicationError({
        code: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
        details: {},
      }),
    rest: {
      statusCode: 404,
      code: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
      message: 'Agent definition cursor belongs to an earlier process.',
      path: null,
    },
    graphql: { statusCode: 404, code: 'REVO_AGENT_SESSION_EXPIRED_CURSOR', path: null },
  },
  {
    name: 'pipeline required',
    error: () =>
      new RunApplicationError({
        code: 'run_selector_invalid',
        details: { selector: 'pipeline', reason: 'required' },
      }),
    rest: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one pipeline selector is required.',
      path: '/pipeline',
      details: { reason: 'required' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one pipeline selector is required.',
      path: '/pipeline',
      details: { reason: 'required' },
    },
  },
  {
    name: 'pipeline conflict',
    error: () =>
      new RunApplicationError({
        code: 'run_selector_invalid',
        details: { selector: 'pipeline', reason: 'conflict' },
      }),
    rest: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one pipeline selector is required.',
      path: '/pipeline',
      details: { reason: 'conflict' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one pipeline selector is required.',
      path: '/pipeline',
      details: { reason: 'conflict' },
    },
  },
  {
    name: 'pipeline invalid_id',
    error: () =>
      new RunApplicationError({
        code: 'run_selector_invalid',
        details: { selector: 'pipeline', reason: 'invalid_id' },
      }),
    rest: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one pipeline selector is required.',
      path: '/pipeline',
      details: { reason: 'invalid_id' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one pipeline selector is required.',
      path: '/pipeline',
      details: { reason: 'invalid_id' },
    },
  },
  {
    name: 'profile required',
    error: () =>
      new RunApplicationError({
        code: 'run_selector_invalid',
        details: { selector: 'profile', reason: 'required' },
      }),
    rest: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one profile selector is required.',
      path: '/profile',
      details: { reason: 'required' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one profile selector is required.',
      path: '/profile',
      details: { reason: 'required' },
    },
  },
  {
    name: 'profile conflict',
    error: () =>
      new RunApplicationError({
        code: 'run_selector_invalid',
        details: { selector: 'profile', reason: 'conflict' },
      }),
    rest: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one profile selector is required.',
      path: '/profile',
      details: { reason: 'conflict' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one profile selector is required.',
      path: '/profile',
      details: { reason: 'conflict' },
    },
  },
  {
    name: 'profile invalid_id',
    error: () =>
      new RunApplicationError({
        code: 'run_selector_invalid',
        details: { selector: 'profile', reason: 'invalid_id' },
      }),
    rest: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one profile selector is required.',
      path: '/profile',
      details: { reason: 'invalid_id' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_selector_invalid',
      message: 'Exactly one profile selector is required.',
      path: '/profile',
      details: { reason: 'invalid_id' },
    },
  },
  {
    name: 'project_id_invalid',
    error: () => new RunApplicationError({ code: 'project_id_invalid', details: {} }),
    rest: {
      statusCode: 400,
      code: 'project_id_invalid',
      message: 'Project ID is required.',
      path: '/projectId',
      details: { reason: 'required' },
    },
    graphql: {
      statusCode: 400,
      code: 'project_id_invalid',
      message: 'Project ID is required.',
      path: '/projectId',
      details: { reason: 'required' },
    },
  },
  {
    name: 'project_unavailable',
    error: () => new RunApplicationError({ code: 'project_unavailable', details: {} }),
    rest: {
      statusCode: 404,
      code: 'project_unavailable',
      message: 'Project was not found.',
      path: '/projectId',
      details: {},
    },
    graphql: {
      statusCode: 404,
      code: 'project_unavailable',
      message: 'Project was not found.',
      path: '/projectId',
      details: {},
    },
  },
  {
    name: 'project_archived',
    error: () => new RunApplicationError({ code: 'project_archived', details: {} }),
    rest: {
      statusCode: 409,
      code: 'project_archived',
      message: 'Project is not active.',
      path: '/projectId',
      details: {},
    },
    graphql: {
      statusCode: 409,
      code: 'project_archived',
      message: 'Project is not active.',
      path: '/projectId',
      details: {},
    },
  },
  {
    name: 'agent_runtime_unavailable {}',
    error: () => convertedRunError(new RunManagerError('agent_runtime_unavailable', {})),
    rest: {
      statusCode: 503,
      code: 'agent_runtime_unavailable',
      message: 'Agent runtime is unavailable.',
      path: null,
      details: {},
    },
    graphql: {
      statusCode: 503,
      code: 'agent_runtime_unavailable',
      message: 'Agent runtime is unavailable.',
      path: null,
      details: {},
    },
  },
  {
    name: 'invalid_list_runs_filter {"path": "", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_list_runs_filter', { path: '', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_list_runs_filter',
      message: 'Run-list filter is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_list_runs_filter',
      message: 'Run-list filter is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_list_runs_filter {"path": "/input", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_list_runs_filter', { path: '/input', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_list_runs_filter',
      message: 'Run-list filter is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_list_runs_filter',
      message: 'Run-list filter is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_create_run_input {"path": "", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_create_run_input', { path: '', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_create_run_input',
      message: 'Create-run input is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_create_run_input',
      message: 'Create-run input is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_create_run_input {"path": "/input", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_create_run_input', { path: '/input', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_create_run_input',
      message: 'Create-run input is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_create_run_input',
      message: 'Create-run input is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_run_id {"path": "", "reason": "invalid"}',
    error: () =>
      convertedRunError(new RunManagerError('invalid_run_id', { path: '', reason: 'invalid' })),
    rest: {
      statusCode: 400,
      code: 'invalid_run_id',
      message: 'Run ID is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_run_id',
      message: 'Run ID is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_run_id {"path": "/input", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_run_id', { path: '/input', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_run_id',
      message: 'Run ID is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_run_id',
      message: 'Run ID is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_run_event_page_input {"path": "", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_run_event_page_input', { path: '', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_run_event_page_input',
      message: 'Run-event page input is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_run_event_page_input',
      message: 'Run-event page input is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_run_event_page_input {"path": "/input", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_run_event_page_input', { path: '/input', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_run_event_page_input',
      message: 'Run-event page input is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_run_event_page_input',
      message: 'Run-event page input is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_run_event_subscription_input {"path": "", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_run_event_subscription_input', {
          path: '',
          reason: 'invalid',
        }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_run_event_subscription_input',
      message: 'Run-event subscription input is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_run_event_subscription_input',
      message: 'Run-event subscription input is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_run_event_subscription_input {"path": "/input", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_run_event_subscription_input', {
          path: '/input',
          reason: 'invalid',
        }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_run_event_subscription_input',
      message: 'Run-event subscription input is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_run_event_subscription_input',
      message: 'Run-event subscription input is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_wait_for_terminal_input {"path": "", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_wait_for_terminal_input', { path: '', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_wait_for_terminal_input',
      message: 'Wait-for-terminal input is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_wait_for_terminal_input',
      message: 'Wait-for-terminal input is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'invalid_wait_for_terminal_input {"path": "/input", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('invalid_wait_for_terminal_input', {
          path: '/input',
          reason: 'invalid',
        }),
      ),
    rest: {
      statusCode: 400,
      code: 'invalid_wait_for_terminal_input',
      message: 'Wait-for-terminal input is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 400,
      code: 'invalid_wait_for_terminal_input',
      message: 'Wait-for-terminal input is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'run_profile_invalid {"path": "", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_profile_invalid', { path: '', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 422,
      code: 'run_profile_invalid',
      message: 'Run profile is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 422,
      code: 'run_profile_invalid',
      message: 'Run profile is invalid.',
      path: '',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'run_profile_invalid {"path": "/input", "reason": "invalid"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_profile_invalid', { path: '/input', reason: 'invalid' }),
      ),
    rest: {
      statusCode: 422,
      code: 'run_profile_invalid',
      message: 'Run profile is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
    graphql: {
      statusCode: 422,
      code: 'run_profile_invalid',
      message: 'Run profile is invalid.',
      path: '/input',
      details: { reason: 'invalid' },
    },
  },
  {
    name: 'manager_not_started {"lifecycle": "created"}',
    error: () =>
      convertedRunError(new RunManagerError('manager_not_started', { lifecycle: 'created' })),
    rest: {
      statusCode: 503,
      code: 'manager_not_started',
      message: 'Run manager is not started.',
      path: null,
      details: { lifecycle: 'created' },
    },
    graphql: {
      statusCode: 503,
      code: 'manager_not_started',
      message: 'Run manager is not started.',
      path: null,
      details: { lifecycle: 'created' },
    },
  },
  {
    name: 'manager_start_failed {"operation": "dbos_launch"}',
    error: () =>
      convertedRunError(new RunManagerError('manager_start_failed', { operation: 'dbos_launch' })),
    rest: {
      statusCode: 503,
      code: 'manager_start_failed',
      message: 'Run manager failed to start.',
      path: null,
      details: { operation: 'dbos_launch' },
    },
    graphql: {
      statusCode: 503,
      code: 'manager_start_failed',
      message: 'Run manager failed to start.',
      path: null,
      details: { operation: 'dbos_launch' },
    },
  },
  {
    name: 'manager_stop_failed {"operation": "agent_shutdown"}',
    error: () =>
      convertedRunError(
        new RunManagerError('manager_stop_failed', { operation: 'agent_shutdown' }),
      ),
    rest: {
      statusCode: 503,
      code: 'manager_stop_failed',
      message: 'Run manager failed to stop.',
      path: null,
      details: { operation: 'agent_shutdown' },
    },
    graphql: {
      statusCode: 503,
      code: 'manager_stop_failed',
      message: 'Run manager failed to stop.',
      path: null,
      details: { operation: 'agent_shutdown' },
    },
  },
  {
    name: 'pipeline_compilation_failed {"diagnostics": [{"family": "pipeline", "code": "test", "path": "/node", "message": "Allowed diagnostic"}]}',
    error: () =>
      convertedRunError(
        new RunManagerError('pipeline_compilation_failed', {
          diagnostics: [
            { family: 'pipeline', code: 'test', path: '/node', message: 'Allowed diagnostic' },
          ],
        }),
      ),
    rest: {
      statusCode: 422,
      code: 'pipeline_compilation_failed',
      message: 'Pipeline compilation failed.',
      path: null,
      details: {
        diagnostics: [
          { family: 'pipeline', code: 'test', path: '/node', message: 'Allowed diagnostic' },
        ],
      },
    },
    graphql: {
      statusCode: 422,
      code: 'pipeline_compilation_failed',
      message: 'Pipeline compilation failed.',
      path: null,
      details: {
        diagnostics: [
          { family: 'pipeline', code: 'test', path: '/node', message: 'Allowed diagnostic' },
        ],
      },
    },
  },
  {
    name: 'run_admission_failed {"operation": "admission_commit"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_admission_failed', { operation: 'admission_commit' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_admission_failed',
      message: 'Run admission failed.',
      path: null,
      details: { operation: 'admission_commit' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_admission_failed',
      message: 'Run admission failed.',
      path: null,
      details: { operation: 'admission_commit' },
    },
  },
  {
    name: 'run_event_cursor_invalid {"runId": "r1", "reason": "malformed"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_event_cursor_invalid', { runId: 'r1', reason: 'malformed' }),
      ),
    rest: {
      statusCode: 400,
      code: 'run_event_cursor_invalid',
      message: 'Run-event cursor is invalid.',
      path: null,
      details: { runId: 'r1', reason: 'malformed' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_event_cursor_invalid',
      message: 'Run-event cursor is invalid.',
      path: null,
      details: { runId: 'r1', reason: 'malformed' },
    },
  },
  {
    name: 'run_event_subscription_failed {"runId": "r1"}',
    error: () =>
      convertedRunError(new RunManagerError('run_event_subscription_failed', { runId: 'r1' })),
    rest: {
      statusCode: 503,
      code: 'run_event_subscription_failed',
      message: 'Run-event subscription failed.',
      path: null,
      details: { runId: 'r1' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_event_subscription_failed',
      message: 'Run-event subscription failed.',
      path: null,
      details: { runId: 'r1' },
    },
  },
  {
    name: 'run_gate_already_resolved {"runId": "r1", "gateId": "g1", "path": null}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_gate_already_resolved', { runId: 'r1', gateId: 'g1', path: null }),
      ),
    rest: {
      statusCode: 409,
      code: 'run_gate_already_resolved',
      message: 'Human gate is already resolved.',
      path: null,
      details: { runId: 'r1', gateId: 'g1' },
    },
    graphql: {
      statusCode: 409,
      code: 'run_gate_already_resolved',
      message: 'Human gate is already resolved.',
      path: null,
      details: { runId: 'r1', gateId: 'g1' },
    },
  },
  {
    name: 'run_gate_answer_invalid {"runId": "r1", "gateId": "g1", "path": "/answer"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_gate_answer_invalid', {
          runId: 'r1',
          gateId: 'g1',
          path: '/answer',
        }),
      ),
    rest: {
      statusCode: 400,
      code: 'run_gate_answer_invalid',
      message: 'Human-gate answer is invalid.',
      path: '/answer',
      details: { runId: 'r1', gateId: 'g1' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_gate_answer_invalid',
      message: 'Human-gate answer is invalid.',
      path: '/answer',
      details: { runId: 'r1', gateId: 'g1' },
    },
  },
  {
    name: 'run_gate_not_found {"runId": "r1", "gateId": "g1", "path": null}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_gate_not_found', { runId: 'r1', gateId: 'g1', path: null }),
      ),
    rest: {
      statusCode: 404,
      code: 'run_gate_not_found',
      message: 'Pending human gate was not found.',
      path: null,
      details: { runId: 'r1', gateId: 'g1' },
    },
    graphql: {
      statusCode: 404,
      code: 'run_gate_not_found',
      message: 'Pending human gate was not found.',
      path: null,
      details: { runId: 'r1', gateId: 'g1' },
    },
  },
  {
    name: 'run_gate_payload_invalid {"runId": "r1", "gateId": "g1", "path": "/payload"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_gate_payload_invalid', {
          runId: 'r1',
          gateId: 'g1',
          path: '/payload',
        }),
      ),
    rest: {
      statusCode: 400,
      code: 'run_gate_payload_invalid',
      message: 'Human-gate payload is invalid.',
      path: '/payload',
      details: { runId: 'r1', gateId: 'g1' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_gate_payload_invalid',
      message: 'Human-gate payload is invalid.',
      path: '/payload',
      details: { runId: 'r1', gateId: 'g1' },
    },
  },
  {
    name: 'run_gate_unauthorized {"runId": "r1", "gateId": "g1", "path": null}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_gate_unauthorized', { runId: 'r1', gateId: 'g1', path: null }),
      ),
    rest: {
      statusCode: 403,
      code: 'run_gate_unauthorized',
      message: 'Actor is not authorized to answer the human gate.',
      path: null,
      details: { runId: 'r1', gateId: 'g1' },
    },
    graphql: {
      statusCode: 403,
      code: 'run_gate_unauthorized',
      message: 'Actor is not authorized to answer the human gate.',
      path: null,
      details: { runId: 'r1', gateId: 'g1' },
    },
  },
  {
    name: 'run_id_conflict {"runId": "r1"}',
    error: () => convertedRunError(new RunManagerError('run_id_conflict', { runId: 'r1' })),
    rest: {
      statusCode: 503,
      code: 'RUN_ID_ALLOCATION_CONFLICT',
      message: 'A run ID could not be allocated.',
      path: null,
      details: {},
    },
    graphql: {
      statusCode: 503,
      code: 'RUN_ID_ALLOCATION_CONFLICT',
      message: 'A run ID could not be allocated.',
      path: null,
      details: {},
    },
  },
  {
    name: 'run_interaction_failed {"runId": "r1", "operation": "cancel"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_interaction_failed', { runId: 'r1', operation: 'cancel' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_interaction_failed',
      message: 'Run interaction could not be committed.',
      path: null,
      details: { runId: 'r1', operation: 'cancel' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_interaction_failed',
      message: 'Run interaction could not be committed.',
      path: null,
      details: { runId: 'r1', operation: 'cancel' },
    },
  },
  {
    name: 'run_not_found {"runId": "r1"}',
    error: () => convertedRunError(new RunManagerError('run_not_found', { runId: 'r1' })),
    rest: {
      statusCode: 404,
      code: 'run_not_found',
      message: 'Run was not found.',
      path: null,
      details: { runId: 'r1' },
    },
    graphql: {
      statusCode: 404,
      code: 'run_not_found',
      message: 'Run was not found.',
      path: null,
      details: { runId: 'r1' },
    },
  },
  {
    name: 'run_read_failed {"runId": null, "operation": "list_runs"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_read_failed', { runId: null, operation: 'list_runs' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: null, operation: 'list_runs' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: null, operation: 'list_runs' },
    },
  },
  {
    name: 'run_read_failed {"runId": "r1", "operation": "get_run"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_read_failed', { runId: 'r1', operation: 'get_run' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: 'r1', operation: 'get_run' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: 'r1', operation: 'get_run' },
    },
  },
  {
    name: 'run_recovery_required {"runId": "r1", "attempts": [{"operationId": "o1", "attemptId": "a1"}]}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_recovery_required', {
          runId: 'r1',
          attempts: [{ operationId: 'o1', attemptId: 'a1' }],
        }),
      ),
    rest: {
      statusCode: 409,
      code: 'run_recovery_required',
      message: 'Run requires recovery before it can continue.',
      path: null,
      details: { runId: 'r1', attempts: [{ operationId: 'o1', attemptId: 'a1' }] },
    },
    graphql: {
      statusCode: 409,
      code: 'run_recovery_required',
      message: 'Run requires recovery before it can continue.',
      path: null,
      details: { runId: 'r1', attempts: [{ operationId: 'o1', attemptId: 'a1' }] },
    },
  },
  {
    name: 'run_requirement_unresolved {"requirementKey": "req", "bindingKey": null, "reason": "missing"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_requirement_unresolved', {
          requirementKey: 'req',
          bindingKey: null,
          reason: 'missing',
        }),
      ),
    rest: {
      statusCode: 422,
      code: 'run_requirement_unresolved',
      message: 'A run requirement could not be resolved.',
      path: null,
      details: { requirementKey: 'req', bindingKey: null, reason: 'missing' },
    },
    graphql: {
      statusCode: 422,
      code: 'run_requirement_unresolved',
      message: 'A run requirement could not be resolved.',
      path: null,
      details: { requirementKey: 'req', bindingKey: null, reason: 'missing' },
    },
  },
  {
    name: 'run_requirement_unresolved {"requirementKey": "req", "bindingKey": "binding", "reason": "missing"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_requirement_unresolved', {
          requirementKey: 'req',
          bindingKey: 'binding',
          reason: 'missing',
        }),
      ),
    rest: {
      statusCode: 422,
      code: 'run_requirement_unresolved',
      message: 'A run requirement could not be resolved.',
      path: null,
      details: { requirementKey: 'req', bindingKey: 'binding', reason: 'missing' },
    },
    graphql: {
      statusCode: 422,
      code: 'run_requirement_unresolved',
      message: 'A run requirement could not be resolved.',
      path: null,
      details: { requirementKey: 'req', bindingKey: 'binding', reason: 'missing' },
    },
  },
  {
    name: 'run_signal_invalid {"runId": "r1", "waitId": "w1", "path": "/signal"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_signal_invalid', { runId: 'r1', waitId: 'w1', path: '/signal' }),
      ),
    rest: {
      statusCode: 400,
      code: 'run_signal_invalid',
      message: 'Signal name is invalid for the pending wait.',
      path: '/signal',
      details: { runId: 'r1', waitId: 'w1' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_signal_invalid',
      message: 'Signal name is invalid for the pending wait.',
      path: '/signal',
      details: { runId: 'r1', waitId: 'w1' },
    },
  },
  {
    name: 'run_signal_payload_invalid {"runId": "r1", "waitId": "w1", "path": "/payload"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_signal_payload_invalid', {
          runId: 'r1',
          waitId: 'w1',
          path: '/payload',
        }),
      ),
    rest: {
      statusCode: 400,
      code: 'run_signal_payload_invalid',
      message: 'Signal payload is invalid.',
      path: '/payload',
      details: { runId: 'r1', waitId: 'w1' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_signal_payload_invalid',
      message: 'Signal payload is invalid.',
      path: '/payload',
      details: { runId: 'r1', waitId: 'w1' },
    },
  },
  {
    name: 'run_wait_aborted {"runId": "r1"}',
    error: () => convertedRunError(new RunManagerError('run_wait_aborted', { runId: 'r1' })),
    rest: {
      statusCode: 503,
      code: 'run_wait_aborted',
      message: 'Waiting for the run was aborted.',
      path: null,
      details: { runId: 'r1' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_wait_aborted',
      message: 'Waiting for the run was aborted.',
      path: null,
      details: { runId: 'r1' },
    },
  },
  {
    name: 'run_wait_already_resolved {"runId": "r1", "waitId": "w1", "path": null}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_wait_already_resolved', { runId: 'r1', waitId: 'w1', path: null }),
      ),
    rest: {
      statusCode: 409,
      code: 'run_wait_already_resolved',
      message: 'Signal wait is already resolved.',
      path: null,
      details: { runId: 'r1', waitId: 'w1' },
    },
    graphql: {
      statusCode: 409,
      code: 'run_wait_already_resolved',
      message: 'Signal wait is already resolved.',
      path: null,
      details: { runId: 'r1', waitId: 'w1' },
    },
  },
  {
    name: 'run_wait_not_found {"runId": "r1", "waitId": "w1", "path": null}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_wait_not_found', { runId: 'r1', waitId: 'w1', path: null }),
      ),
    rest: {
      statusCode: 404,
      code: 'run_wait_not_found',
      message: 'Pending signal wait was not found.',
      path: null,
      details: { runId: 'r1', waitId: 'w1' },
    },
    graphql: {
      statusCode: 404,
      code: 'run_wait_not_found',
      message: 'Pending signal wait was not found.',
      path: null,
      details: { runId: 'r1', waitId: 'w1' },
    },
  },
  {
    name: 'run_wait_timed_out {"runId": "r1", "timeoutMs": 1000}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_wait_timed_out', { runId: 'r1', timeoutMs: 1000 }),
      ),
    rest: {
      statusCode: 504,
      code: 'run_wait_timed_out',
      message: 'Waiting for the run timed out.',
      path: null,
      details: { runId: 'r1', timeoutMs: 1000 },
    },
    graphql: {
      statusCode: 504,
      code: 'run_wait_timed_out',
      message: 'Waiting for the run timed out.',
      path: null,
      details: { runId: 'r1', timeoutMs: 1000 },
    },
  },
  {
    name: 'manager_not_started {"lifecycle": "stopping"}',
    error: () =>
      convertedRunError(new RunManagerError('manager_not_started', { lifecycle: 'stopping' })),
    rest: {
      statusCode: 503,
      code: 'manager_not_started',
      message: 'Run manager is not started.',
      path: null,
      details: { lifecycle: 'stopping' },
    },
    graphql: {
      statusCode: 503,
      code: 'manager_not_started',
      message: 'Run manager is not started.',
      path: null,
      details: { lifecycle: 'stopping' },
    },
  },
  {
    name: 'manager_not_started {"lifecycle": "stopped"}',
    error: () =>
      convertedRunError(new RunManagerError('manager_not_started', { lifecycle: 'stopped' })),
    rest: {
      statusCode: 503,
      code: 'manager_not_started',
      message: 'Run manager is not started.',
      path: null,
      details: { lifecycle: 'stopped' },
    },
    graphql: {
      statusCode: 503,
      code: 'manager_not_started',
      message: 'Run manager is not started.',
      path: null,
      details: { lifecycle: 'stopped' },
    },
  },
  {
    name: 'manager_start_failed {"operation": "host_initialization"}',
    error: () =>
      convertedRunError(
        new RunManagerError('manager_start_failed', { operation: 'host_initialization' }),
      ),
    rest: {
      statusCode: 503,
      code: 'manager_start_failed',
      message: 'Run manager failed to start.',
      path: null,
      details: { operation: 'host_initialization' },
    },
    graphql: {
      statusCode: 503,
      code: 'manager_start_failed',
      message: 'Run manager failed to start.',
      path: null,
      details: { operation: 'host_initialization' },
    },
  },
  {
    name: 'manager_stop_failed {"operation": "scripts_shutdown"}',
    error: () =>
      convertedRunError(
        new RunManagerError('manager_stop_failed', { operation: 'scripts_shutdown' }),
      ),
    rest: {
      statusCode: 503,
      code: 'manager_stop_failed',
      message: 'Run manager failed to stop.',
      path: null,
      details: { operation: 'scripts_shutdown' },
    },
    graphql: {
      statusCode: 503,
      code: 'manager_stop_failed',
      message: 'Run manager failed to stop.',
      path: null,
      details: { operation: 'scripts_shutdown' },
    },
  },
  {
    name: 'manager_stop_failed {"operation": "dbos_shutdown"}',
    error: () =>
      convertedRunError(new RunManagerError('manager_stop_failed', { operation: 'dbos_shutdown' })),
    rest: {
      statusCode: 503,
      code: 'manager_stop_failed',
      message: 'Run manager failed to stop.',
      path: null,
      details: { operation: 'dbos_shutdown' },
    },
    graphql: {
      statusCode: 503,
      code: 'manager_stop_failed',
      message: 'Run manager failed to stop.',
      path: null,
      details: { operation: 'dbos_shutdown' },
    },
  },
  {
    name: 'run_admission_failed {"operation": "workflow_start"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_admission_failed', { operation: 'workflow_start' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_admission_failed',
      message: 'Run admission failed.',
      path: null,
      details: { operation: 'workflow_start' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_admission_failed',
      message: 'Run admission failed.',
      path: null,
      details: { operation: 'workflow_start' },
    },
  },
  {
    name: 'run_event_cursor_invalid {"runId": "r1", "reason": "foreign"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_event_cursor_invalid', { runId: 'r1', reason: 'foreign' }),
      ),
    rest: {
      statusCode: 400,
      code: 'run_event_cursor_invalid',
      message: 'Run-event cursor is invalid.',
      path: null,
      details: { runId: 'r1', reason: 'foreign' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_event_cursor_invalid',
      message: 'Run-event cursor is invalid.',
      path: null,
      details: { runId: 'r1', reason: 'foreign' },
    },
  },
  {
    name: 'run_event_cursor_invalid {"runId": "r1", "reason": "ahead"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_event_cursor_invalid', { runId: 'r1', reason: 'ahead' }),
      ),
    rest: {
      statusCode: 400,
      code: 'run_event_cursor_invalid',
      message: 'Run-event cursor is invalid.',
      path: null,
      details: { runId: 'r1', reason: 'ahead' },
    },
    graphql: {
      statusCode: 400,
      code: 'run_event_cursor_invalid',
      message: 'Run-event cursor is invalid.',
      path: null,
      details: { runId: 'r1', reason: 'ahead' },
    },
  },
  {
    name: 'run_interaction_failed {"runId": "r1", "operation": "signal"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_interaction_failed', { runId: 'r1', operation: 'signal' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_interaction_failed',
      message: 'Run interaction could not be committed.',
      path: null,
      details: { runId: 'r1', operation: 'signal' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_interaction_failed',
      message: 'Run interaction could not be committed.',
      path: null,
      details: { runId: 'r1', operation: 'signal' },
    },
  },
  {
    name: 'run_interaction_failed {"runId": "r1", "operation": "gate"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_interaction_failed', { runId: 'r1', operation: 'gate' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_interaction_failed',
      message: 'Run interaction could not be committed.',
      path: null,
      details: { runId: 'r1', operation: 'gate' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_interaction_failed',
      message: 'Run interaction could not be committed.',
      path: null,
      details: { runId: 'r1', operation: 'gate' },
    },
  },
  {
    name: 'run_read_failed {"runId": null, "operation": "get_details"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_read_failed', { runId: null, operation: 'get_details' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: null, operation: 'get_details' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: null, operation: 'get_details' },
    },
  },
  {
    name: 'run_read_failed {"runId": null, "operation": "get_events"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_read_failed', { runId: null, operation: 'get_events' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: null, operation: 'get_events' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: null, operation: 'get_events' },
    },
  },
  {
    name: 'run_read_failed {"runId": null, "operation": "wait_for_terminal"}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_read_failed', { runId: null, operation: 'wait_for_terminal' }),
      ),
    rest: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: null, operation: 'wait_for_terminal' },
    },
    graphql: {
      statusCode: 503,
      code: 'run_read_failed',
      message: 'Run observation could not be read.',
      path: null,
      details: { runId: null, operation: 'wait_for_terminal' },
    },
  },
  {
    name: 'pipeline_compilation_failed {"diagnostics": []}',
    error: () =>
      convertedRunError(new RunManagerError('pipeline_compilation_failed', { diagnostics: [] })),
    rest: {
      statusCode: 422,
      code: 'pipeline_compilation_failed',
      message: 'Pipeline compilation failed.',
      path: null,
      details: { diagnostics: [] },
    },
    graphql: {
      statusCode: 422,
      code: 'pipeline_compilation_failed',
      message: 'Pipeline compilation failed.',
      path: null,
      details: { diagnostics: [] },
    },
  },
  {
    name: 'run_recovery_required {"runId": "r1", "attempts": []}',
    error: () =>
      convertedRunError(
        new RunManagerError('run_recovery_required', { runId: 'r1', attempts: [] }),
      ),
    rest: {
      statusCode: 409,
      code: 'run_recovery_required',
      message: 'Run requires recovery before it can continue.',
      path: null,
      details: { runId: 'r1', attempts: [] },
    },
    graphql: {
      statusCode: 409,
      code: 'run_recovery_required',
      message: 'Run requires recovery before it can continue.',
      path: null,
      details: { runId: 'r1', attempts: [] },
    },
  },
  {
    name: 'Catalog contract pipeline',
    error: () => new CatalogDefinitionCorruptError('pipeline'),
    rest: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/pipeline',
      details: { reason: 'storage_json' },
    },
    graphql: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/pipeline',
      details: { reason: 'storage_json' },
    },
  },
  {
    name: 'Run through Catalog codec pipeline',
    error: () => convertedCatalogError(corruptCatalogError('pipeline')),
    rest: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/pipeline',
      details: { reason: 'storage_json' },
    },
    graphql: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/pipeline',
      details: { reason: 'storage_json' },
    },
  },
  {
    name: 'Standalone Catalog codec pipeline',
    error: () => corruptCatalogError('pipeline'),
    rest: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/pipeline',
      details: { reason: 'storage_json' },
    },
    graphql: undefined,
  },
  {
    name: 'Catalog contract profile',
    error: () => new CatalogDefinitionCorruptError('profile'),
    rest: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/profile',
      details: { reason: 'storage_json' },
    },
    graphql: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/profile',
      details: { reason: 'storage_json' },
    },
  },
  {
    name: 'Run through Catalog codec profile',
    error: () => convertedCatalogError(corruptCatalogError('profile')),
    rest: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/profile',
      details: { reason: 'storage_json' },
    },
    graphql: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/profile',
      details: { reason: 'storage_json' },
    },
  },
  {
    name: 'Standalone Catalog codec profile',
    error: () => corruptCatalogError('profile'),
    rest: {
      statusCode: 409,
      code: 'catalog_definition_corrupt',
      message: 'Catalog definition is corrupt.',
      path: '/profile',
      details: { reason: 'storage_json' },
    },
    graphql: undefined,
  },
  {
    name: 'Run through missing Catalog lookup',
    error: () => convertedCatalogError(new NotFoundException('Record unavailable')),
    rest: { statusCode: 404, message: 'Record unavailable', error: 'Not Found' },
    graphql: undefined,
  },
];

export function convertedRunError(error: RunManagerError): unknown {
  try {
    return rethrowPublicRunError(error);
  } catch (failure) {
    return failure;
  }
}

export function convertedCatalogError(error: unknown): unknown {
  try {
    return rethrowCatalogReadError(error);
  } catch (failure) {
    return failure;
  }
}

export function corruptCatalogError(field: 'pipeline' | 'profile'): unknown {
  try {
    if (field === 'pipeline') {
      decodePipelineRecordData({ pipeline: '{' });
    } else {
      decodeLaunchProfileRecordData({ profile: '{' });
    }
  } catch (error) {
    return error;
  }

  throw new Error('Corrupt Catalog fixture did not fail.');
}
