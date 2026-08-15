import { BootstrapCatalogHandler } from './handlers/bootstrap-catalog.handler.js';
import { CommitCatalogHandler } from './handlers/commit-catalog.handler.js';
import { CreateLaunchProfileHandler } from './handlers/create-launch-profile.handler.js';
import { CreateMethodDocumentHandler } from './handlers/create-method-document.handler.js';
import { CreatePipelineRoleHandler } from './handlers/create-pipeline-role.handler.js';
import { CreatePipelineHandler } from './handlers/create-pipeline.handler.js';
import { CreatePlaybookHandler } from './handlers/create-playbook.handler.js';
import { CreateRoleRefHandler } from './handlers/create-role-ref.handler.js';
import { CreateRoleHandler } from './handlers/create-role.handler.js';
import { CreateSharedReferenceHandler } from './handlers/create-shared-reference.handler.js';
import { CreateStackRefHandler } from './handlers/create-stack-ref.handler.js';
import { CreateStackHandler } from './handlers/create-stack.handler.js';
import { DeleteLaunchProfileHandler } from './handlers/delete-launch-profile.handler.js';
import { DeleteMethodDocumentHandler } from './handlers/delete-method-document.handler.js';
import { DeletePipelineRoleHandler } from './handlers/delete-pipeline-role.handler.js';
import { DeletePipelineSourceHandler } from './handlers/delete-pipeline-source.handler.js';
import { DeletePipelineHandler } from './handlers/delete-pipeline.handler.js';
import { DeletePlaybookHandler } from './handlers/delete-playbook.handler.js';
import { DeleteRoleRefHandler } from './handlers/delete-role-ref.handler.js';
import { DeleteRoleHandler } from './handlers/delete-role.handler.js';
import { DeleteSharedReferenceHandler } from './handlers/delete-shared-reference.handler.js';
import { DeleteStackRefHandler } from './handlers/delete-stack-ref.handler.js';
import { DeleteStackHandler } from './handlers/delete-stack.handler.js';
import { DiscardCatalogHandler } from './handlers/discard-catalog.handler.js';
import { ImportCatalogHandler } from './handlers/import-catalog.handler.js';
import { UpdateLaunchProfileHandler } from './handlers/update-launch-profile.handler.js';
import { UpdateMethodDocumentHandler } from './handlers/update-method-document.handler.js';
import { UpdatePipelineSourceHandler } from './handlers/update-pipeline-source.handler.js';
import { UpdatePipelineHandler } from './handlers/update-pipeline.handler.js';
import { UpdatePlaybookHandler } from './handlers/update-playbook.handler.js';
import { UpdateRoleRefHandler } from './handlers/update-role-ref.handler.js';
import { UpdateRoleHandler } from './handlers/update-role.handler.js';
import { UpdateSharedReferenceHandler } from './handlers/update-shared-reference.handler.js';
import { UpdateStackRefHandler } from './handlers/update-stack-ref.handler.js';
import { UpdateStackHandler } from './handlers/update-stack.handler.js';

export { CreatePlaybookCommand } from './impl/create-playbook.command.js';
export type {
  CreatePlaybookCommandData,
  CreatePlaybookCommandReturnType,
} from './impl/create-playbook.command.js';
export { UpdatePlaybookCommand } from './impl/update-playbook.command.js';
export type {
  UpdatePlaybookCommandData,
  UpdatePlaybookCommandReturnType,
} from './impl/update-playbook.command.js';
export { DeletePlaybookCommand } from './impl/delete-playbook.command.js';
export type {
  DeletePlaybookCommandData,
  DeletePlaybookCommandReturnType,
} from './impl/delete-playbook.command.js';
export { CreateRoleCommand } from './impl/create-role.command.js';
export type {
  CreateRoleCommandData,
  CreateRoleCommandReturnType,
} from './impl/create-role.command.js';
export { UpdateRoleCommand } from './impl/update-role.command.js';
export type {
  UpdateRoleCommandData,
  UpdateRoleCommandReturnType,
} from './impl/update-role.command.js';
export { DeleteRoleCommand } from './impl/delete-role.command.js';
export type {
  DeleteRoleCommandData,
  DeleteRoleCommandReturnType,
} from './impl/delete-role.command.js';
export { CreateRoleRefCommand } from './impl/create-role-ref.command.js';
export type {
  CreateRoleRefCommandData,
  CreateRoleRefCommandReturnType,
} from './impl/create-role-ref.command.js';
export { UpdateRoleRefCommand } from './impl/update-role-ref.command.js';
export type {
  UpdateRoleRefCommandData,
  UpdateRoleRefCommandReturnType,
} from './impl/update-role-ref.command.js';
export { DeleteRoleRefCommand } from './impl/delete-role-ref.command.js';
export type {
  DeleteRoleRefCommandData,
  DeleteRoleRefCommandReturnType,
} from './impl/delete-role-ref.command.js';
export { CreateSharedReferenceCommand } from './impl/create-shared-reference.command.js';
export type {
  CreateSharedReferenceCommandData,
  CreateSharedReferenceCommandReturnType,
} from './impl/create-shared-reference.command.js';
export { UpdateSharedReferenceCommand } from './impl/update-shared-reference.command.js';
export type {
  UpdateSharedReferenceCommandData,
  UpdateSharedReferenceCommandReturnType,
} from './impl/update-shared-reference.command.js';
export { DeleteSharedReferenceCommand } from './impl/delete-shared-reference.command.js';
export type {
  DeleteSharedReferenceCommandData,
  DeleteSharedReferenceCommandReturnType,
} from './impl/delete-shared-reference.command.js';
export { CreateStackCommand } from './impl/create-stack.command.js';
export type {
  CreateStackCommandData,
  CreateStackCommandReturnType,
} from './impl/create-stack.command.js';
export { UpdateStackCommand } from './impl/update-stack.command.js';
export type {
  UpdateStackCommandData,
  UpdateStackCommandReturnType,
} from './impl/update-stack.command.js';
export { DeleteStackCommand } from './impl/delete-stack.command.js';
export type {
  DeleteStackCommandData,
  DeleteStackCommandReturnType,
} from './impl/delete-stack.command.js';
export { CreateStackRefCommand } from './impl/create-stack-ref.command.js';
export type {
  CreateStackRefCommandData,
  CreateStackRefCommandReturnType,
} from './impl/create-stack-ref.command.js';
export { UpdateStackRefCommand } from './impl/update-stack-ref.command.js';
export type {
  UpdateStackRefCommandData,
  UpdateStackRefCommandReturnType,
} from './impl/update-stack-ref.command.js';
export { DeleteStackRefCommand } from './impl/delete-stack-ref.command.js';
export type {
  DeleteStackRefCommandData,
  DeleteStackRefCommandReturnType,
} from './impl/delete-stack-ref.command.js';
export { CreateMethodDocumentCommand } from './impl/create-method-document.command.js';
export type {
  CreateMethodDocumentCommandData,
  CreateMethodDocumentCommandReturnType,
} from './impl/create-method-document.command.js';
export { UpdateMethodDocumentCommand } from './impl/update-method-document.command.js';
export type {
  UpdateMethodDocumentCommandData,
  UpdateMethodDocumentCommandReturnType,
} from './impl/update-method-document.command.js';
export { DeleteMethodDocumentCommand } from './impl/delete-method-document.command.js';
export type {
  DeleteMethodDocumentCommandData,
  DeleteMethodDocumentCommandReturnType,
} from './impl/delete-method-document.command.js';
export { CreatePipelineCommand } from './impl/create-pipeline.command.js';
export type {
  CreatePipelineCommandData,
  CreatePipelineCommandReturnType,
} from './impl/create-pipeline.command.js';
export { UpdatePipelineCommand } from './impl/update-pipeline.command.js';
export type {
  UpdatePipelineCommandData,
  UpdatePipelineCommandReturnType,
} from './impl/update-pipeline.command.js';
export { DeletePipelineCommand } from './impl/delete-pipeline.command.js';
export type {
  DeletePipelineCommandData,
  DeletePipelineCommandReturnType,
} from './impl/delete-pipeline.command.js';
export { CreatePipelineRoleCommand } from './impl/create-pipeline-role.command.js';
export type {
  CreatePipelineRoleCommandData,
  CreatePipelineRoleCommandReturnType,
} from './impl/create-pipeline-role.command.js';
export { DeletePipelineRoleCommand } from './impl/delete-pipeline-role.command.js';
export type {
  DeletePipelineRoleCommandData,
  DeletePipelineRoleCommandReturnType,
} from './impl/delete-pipeline-role.command.js';
export { DeletePipelineSourceCommand } from './impl/delete-pipeline-source.command.js';
export type {
  DeletePipelineSourceCommandData,
  DeletePipelineSourceCommandReturnType,
} from './impl/delete-pipeline-source.command.js';
export { CreateLaunchProfileCommand } from './impl/create-launch-profile.command.js';
export type {
  CreateLaunchProfileCommandData,
  CreateLaunchProfileCommandReturnType,
} from './impl/create-launch-profile.command.js';
export { UpdateLaunchProfileCommand } from './impl/update-launch-profile.command.js';
export type {
  UpdateLaunchProfileCommandData,
  UpdateLaunchProfileCommandReturnType,
} from './impl/update-launch-profile.command.js';
export { DeleteLaunchProfileCommand } from './impl/delete-launch-profile.command.js';
export type {
  DeleteLaunchProfileCommandData,
  DeleteLaunchProfileCommandReturnType,
} from './impl/delete-launch-profile.command.js';
export { BootstrapCatalogCommand } from './impl/bootstrap-catalog.command.js';
export type { BootstrapCatalogCommandReturnType } from './impl/bootstrap-catalog.command.js';
export { CommitCatalogCommand } from './impl/commit-catalog.command.js';
export type {
  CommitCatalogCommandData,
  CommitCatalogCommandReturnType,
} from './impl/commit-catalog.command.js';
export { DiscardCatalogCommand } from './impl/discard-catalog.command.js';
export type { DiscardCatalogCommandReturnType } from './impl/discard-catalog.command.js';
export { ImportCatalogCommand } from './impl/import-catalog.command.js';
export type {
  ImportCatalogCommandData,
  ImportCatalogCommandReturnType,
} from './impl/import-catalog.command.js';
export { UpdatePipelineSourceCommand } from './impl/update-pipeline-source.command.js';
export type {
  UpdatePipelineSourceCommandData,
  UpdatePipelineSourceCommandReturnType,
} from './impl/update-pipeline-source.command.js';

export const PLAYBOOK_CATALOG_COMMAND_HANDLERS = [
  CreatePlaybookHandler,
  UpdatePlaybookHandler,
  DeletePlaybookHandler,
  CreateRoleHandler,
  UpdateRoleHandler,
  DeleteRoleHandler,
  CreateRoleRefHandler,
  UpdateRoleRefHandler,
  DeleteRoleRefHandler,
  CreateSharedReferenceHandler,
  UpdateSharedReferenceHandler,
  DeleteSharedReferenceHandler,
  CreateStackHandler,
  UpdateStackHandler,
  DeleteStackHandler,
  CreateStackRefHandler,
  UpdateStackRefHandler,
  DeleteStackRefHandler,
  CreateMethodDocumentHandler,
  UpdateMethodDocumentHandler,
  DeleteMethodDocumentHandler,
  CreatePipelineHandler,
  UpdatePipelineHandler,
  DeletePipelineHandler,
  CreatePipelineRoleHandler,
  DeletePipelineRoleHandler,
  DeletePipelineSourceHandler,
  CreateLaunchProfileHandler,
  UpdateLaunchProfileHandler,
  DeleteLaunchProfileHandler,
  UpdatePipelineSourceHandler,
  ImportCatalogHandler,
  CommitCatalogHandler,
  DiscardCatalogHandler,
  BootstrapCatalogHandler,
];
