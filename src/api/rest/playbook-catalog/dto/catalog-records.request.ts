import { ApiProperty, OmitType } from '@nestjs/swagger';
import type { PipelineSourcePackage, RunProfile } from '@revisium/revo-run';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsObject, IsString, ValidateNested } from 'class-validator';

import { type LaunchProfileStatus } from '../../../../features/playbook-catalog/contracts/catalog.enums.js';

export class PlaybookRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  name: string;
}
export class PlaybookUpdateRequest extends OmitType(PlaybookRequest, ['id'] as const) {}

export class RoleRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  playbookId: string;

  @ApiProperty()
  @IsString()
  body: string;
}
export class RoleUpdateRequest extends OmitType(RoleRequest, ['id'] as const) {}

export class RoleRefRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  roleId: string;

  @ApiProperty()
  @IsString()
  body: string;
}
export class RoleRefUpdateRequest extends OmitType(RoleRefRequest, ['id'] as const) {}

export class SharedReferenceRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  playbookId: string;

  @ApiProperty()
  @IsString()
  body: string;
}
export class SharedReferenceUpdateRequest extends OmitType(SharedReferenceRequest, [
  'id',
] as const) {}

export class StackRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  playbookId: string;

  @ApiProperty()
  @IsString()
  body: string;
}
export class StackUpdateRequest extends OmitType(StackRequest, ['id'] as const) {}

export class StackRefRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  stackId: string;

  @ApiProperty()
  @IsString()
  body: string;
}
export class StackRefUpdateRequest extends OmitType(StackRefRequest, ['id'] as const) {}

export class MethodDocumentRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  playbookId: string;

  @ApiProperty({ enum: ['method', 'template', 'checklist', 'nav'] })
  @IsIn(['method', 'template', 'checklist', 'nav'])
  kind: 'method' | 'template' | 'checklist' | 'nav';

  @ApiProperty()
  @IsString()
  body: string;
}
export class MethodDocumentUpdateRequest extends OmitType(MethodDocumentRequest, ['id'] as const) {}

export class PipelineRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  playbookId: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  pipeline: PipelineSourcePackage;
}
export class PipelineUpdateRequest extends OmitType(PipelineRequest, ['id'] as const) {}

export class PipelineRoleRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  pipelineId: string;

  @ApiProperty()
  @IsString()
  roleId: string;

  @ApiProperty({ enum: ['required', 'optional', 'alternative'] })
  @IsIn(['required', 'optional', 'alternative'])
  membership: 'required' | 'optional' | 'alternative';
}

export class LaunchProfileRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  pipelineId: string;

  @ApiProperty({ enum: ['active', 'deprecated'] })
  @IsIn(['active', 'deprecated'])
  status: LaunchProfileStatus;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  profile: RunProfile;
}
export class LaunchProfileUpdateRequest extends OmitType(LaunchProfileRequest, ['id'] as const) {}

export class CommitCatalogRequest {
  @ApiProperty()
  @IsString()
  message: string;
}

export class CatalogImportTablesRequest {
  @ApiProperty({ type: [PlaybookRequest], required: false })
  playbooks?: PlaybookRequest[];
  @ApiProperty({ type: [RoleRequest], required: false })
  roles?: RoleRequest[];
  @ApiProperty({ type: [SharedReferenceRequest], required: false })
  shared_references?: SharedReferenceRequest[];
  @ApiProperty({ type: [StackRequest], required: false })
  stacks?: StackRequest[];
  @ApiProperty({ type: [MethodDocumentRequest], required: false })
  method_documents?: MethodDocumentRequest[];
  @ApiProperty({ type: [PipelineRequest], required: false })
  pipelines?: PipelineRequest[];
  @ApiProperty({ type: [RoleRefRequest], required: false })
  role_refs?: RoleRefRequest[];
  @ApiProperty({ type: [StackRefRequest], required: false })
  stack_refs?: StackRefRequest[];
  @ApiProperty({ type: [PipelineRoleRequest], required: false })
  pipeline_roles?: PipelineRoleRequest[];
  @ApiProperty({ type: [LaunchProfileRequest], required: false })
  launch_profiles?: LaunchProfileRequest[];
}

export class CatalogImportRequest {
  @ApiProperty({ enum: [1] })
  @IsNumber()
  version: 1;

  @ApiProperty({ type: CatalogImportTablesRequest })
  @ValidateNested()
  @Type(() => CatalogImportTablesRequest)
  tables: CatalogImportTablesRequest;
}
