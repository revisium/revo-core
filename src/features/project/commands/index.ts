import { ArchiveUserProjectHandler } from './handlers/archive-user-project.handler.js';
import { CleanupProjectDatasetHandler } from './handlers/cleanup-project-dataset.handler.js';
import { CreateAdrHandler } from './handlers/create-adr.handler.js';
import { CreateRequirementHandler } from './handlers/create-requirement.handler.js';
import { CreateUserProjectHandler } from './handlers/create-user-project.handler.js';
import { CreateWorkItemHandler } from './handlers/create-work-item.handler.js';
import { CreateWorkPlanHandler } from './handlers/create-work-plan.handler.js';
import { DeleteAdrHandler } from './handlers/delete-adr.handler.js';
import { DeleteRequirementHandler } from './handlers/delete-requirement.handler.js';
import { DeleteUserProjectHandler } from './handlers/delete-user-project.handler.js';
import { DeleteWorkItemHandler } from './handlers/delete-work-item.handler.js';
import { DeleteWorkPlanHandler } from './handlers/delete-work-plan.handler.js';
import { EnsureProjectHandler } from './handlers/ensure-project.handler.js';
import { RestoreUserProjectHandler } from './handlers/restore-user-project.handler.js';
import { UpdateAdrHandler } from './handlers/update-adr.handler.js';
import { UpdateRequirementHandler } from './handlers/update-requirement.handler.js';
import { UpdateUserProjectHandler } from './handlers/update-user-project.handler.js';
import { UpdateWorkItemHandler } from './handlers/update-work-item.handler.js';
import { UpdateWorkPlanHandler } from './handlers/update-work-plan.handler.js';

export { ArchiveUserProjectCommand } from './impl/archive-user-project.command.js';
export type {
  ArchiveUserProjectCommandData,
  ArchiveUserProjectCommandReturnType,
} from './impl/archive-user-project.command.js';
export { CleanupProjectDatasetCommand } from './impl/cleanup-project-dataset.command.js';
export type {
  CleanupProjectDatasetCommandData,
  CleanupProjectDatasetCommandReturnType,
} from './impl/cleanup-project-dataset.command.js';
export { CreateAdrCommand } from './impl/create-adr.command.js';
export type {
  CreateAdrCommandData,
  CreateAdrCommandReturnType,
} from './impl/create-adr.command.js';
export { CreateRequirementCommand } from './impl/create-requirement.command.js';
export type {
  CreateRequirementCommandData,
  CreateRequirementCommandReturnType,
} from './impl/create-requirement.command.js';
export { CreateUserProjectCommand } from './impl/create-user-project.command.js';
export type {
  CreateUserProjectCommandData,
  CreateUserProjectCommandReturnType,
} from './impl/create-user-project.command.js';
export { CreateWorkItemCommand } from './impl/create-work-item.command.js';
export type {
  CreateWorkItemCommandData,
  CreateWorkItemCommandReturnType,
} from './impl/create-work-item.command.js';
export { CreateWorkPlanCommand } from './impl/create-work-plan.command.js';
export type {
  CreateWorkPlanCommandData,
  CreateWorkPlanCommandReturnType,
} from './impl/create-work-plan.command.js';
export { DeleteAdrCommand } from './impl/delete-adr.command.js';
export type {
  DeleteAdrCommandData,
  DeleteAdrCommandReturnType,
} from './impl/delete-adr.command.js';
export { DeleteRequirementCommand } from './impl/delete-requirement.command.js';
export type {
  DeleteRequirementCommandData,
  DeleteRequirementCommandReturnType,
} from './impl/delete-requirement.command.js';
export { DeleteUserProjectCommand } from './impl/delete-user-project.command.js';
export type {
  DeleteUserProjectCommandData,
  DeleteUserProjectCommandReturnType,
} from './impl/delete-user-project.command.js';
export { DeleteWorkItemCommand } from './impl/delete-work-item.command.js';
export type {
  DeleteWorkItemCommandData,
  DeleteWorkItemCommandReturnType,
} from './impl/delete-work-item.command.js';
export { DeleteWorkPlanCommand } from './impl/delete-work-plan.command.js';
export type {
  DeleteWorkPlanCommandData,
  DeleteWorkPlanCommandReturnType,
} from './impl/delete-work-plan.command.js';
export { EnsureProjectCommand } from './impl/ensure-project.command.js';
export type {
  EnsureProjectCommandData,
  EnsureProjectCommandReturnType,
} from './impl/ensure-project.command.js';
export { RestoreUserProjectCommand } from './impl/restore-user-project.command.js';
export type {
  RestoreUserProjectCommandData,
  RestoreUserProjectCommandReturnType,
} from './impl/restore-user-project.command.js';
export { UpdateAdrCommand } from './impl/update-adr.command.js';
export type {
  UpdateAdrCommandData,
  UpdateAdrCommandReturnType,
} from './impl/update-adr.command.js';
export { UpdateRequirementCommand } from './impl/update-requirement.command.js';
export type {
  UpdateRequirementCommandData,
  UpdateRequirementCommandReturnType,
} from './impl/update-requirement.command.js';
export { UpdateUserProjectCommand } from './impl/update-user-project.command.js';
export type {
  UpdateUserProjectCommandData,
  UpdateUserProjectCommandReturnType,
} from './impl/update-user-project.command.js';
export { UpdateWorkItemCommand } from './impl/update-work-item.command.js';
export type {
  UpdateWorkItemCommandData,
  UpdateWorkItemCommandReturnType,
} from './impl/update-work-item.command.js';
export { UpdateWorkPlanCommand } from './impl/update-work-plan.command.js';
export type {
  UpdateWorkPlanCommandData,
  UpdateWorkPlanCommandReturnType,
} from './impl/update-work-plan.command.js';

export const PROJECT_COMMAND_HANDLERS = [
  EnsureProjectHandler,
  CreateUserProjectHandler,
  UpdateUserProjectHandler,
  ArchiveUserProjectHandler,
  DeleteUserProjectHandler,
  RestoreUserProjectHandler,
  CleanupProjectDatasetHandler,
  CreateAdrHandler,
  UpdateAdrHandler,
  DeleteAdrHandler,
  CreateRequirementHandler,
  UpdateRequirementHandler,
  DeleteRequirementHandler,
  CreateWorkPlanHandler,
  UpdateWorkPlanHandler,
  DeleteWorkPlanHandler,
  CreateWorkItemHandler,
  UpdateWorkItemHandler,
  DeleteWorkItemHandler,
];
