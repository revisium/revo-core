import { ApplyContentModelHandler } from './handlers/apply-content-model.handler.js';
import { CleanupProjectDatasetHandler } from './handlers/cleanup-project-dataset.handler.js';
import { CreateProjectRecordHandler } from './handlers/create-project-record.handler.js';
import { CreateUserProjectHandler } from './handlers/create-user-project.handler.js';
import { DeleteProjectRecordHandler } from './handlers/delete-project-record.handler.js';
import { DeleteUserProjectHandler } from './handlers/delete-user-project.handler.js';
import { EnsureProjectHandler } from './handlers/ensure-project.handler.js';
import { UpdateProjectRecordHandler } from './handlers/update-project-record.handler.js';

export { ApplyContentModelCommand } from './impl/apply-content-model.command.js';
export type {
  ApplyContentModelCommandData,
  ApplyContentModelCommandReturnType,
} from './impl/apply-content-model.command.js';
export { CleanupProjectDatasetCommand } from './impl/cleanup-project-dataset.command.js';
export type {
  CleanupProjectDatasetCommandData,
  CleanupProjectDatasetCommandReturnType,
} from './impl/cleanup-project-dataset.command.js';
export { CreateProjectRecordCommand } from './impl/create-project-record.command.js';
export type {
  CreateProjectRecordCommandData,
  CreateProjectRecordCommandReturnType,
} from './impl/create-project-record.command.js';
export { CreateUserProjectCommand } from './impl/create-user-project.command.js';
export type {
  CreateUserProjectCommandData,
  CreateUserProjectCommandReturnType,
} from './impl/create-user-project.command.js';
export { DeleteProjectRecordCommand } from './impl/delete-project-record.command.js';
export type {
  DeleteProjectRecordCommandData,
  DeleteProjectRecordCommandReturnType,
} from './impl/delete-project-record.command.js';
export { DeleteUserProjectCommand } from './impl/delete-user-project.command.js';
export type {
  DeleteUserProjectCommandData,
  DeleteUserProjectCommandReturnType,
} from './impl/delete-user-project.command.js';
export { EnsureProjectCommand } from './impl/ensure-project.command.js';
export type {
  EnsureProjectCommandData,
  EnsureProjectCommandReturnType,
} from './impl/ensure-project.command.js';
export { UpdateProjectRecordCommand } from './impl/update-project-record.command.js';
export type {
  UpdateProjectRecordCommandData,
  UpdateProjectRecordCommandReturnType,
} from './impl/update-project-record.command.js';

export const PROJECT_COMMAND_HANDLERS = [
  EnsureProjectHandler,
  CreateUserProjectHandler,
  DeleteUserProjectHandler,
  ApplyContentModelHandler,
  CleanupProjectDatasetHandler,
  CreateProjectRecordHandler,
  UpdateProjectRecordHandler,
  DeleteProjectRecordHandler,
];
