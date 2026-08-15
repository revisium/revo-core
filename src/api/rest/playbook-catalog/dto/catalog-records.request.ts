import { ApiProperty, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsNumber, IsString, ValidateNested } from 'class-validator';

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

  @ApiProperty()
  @IsString()
  body: string;
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

export class PipelineSourceRequest {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  pipelineId: string;

  @ApiProperty()
  @IsString()
  sourceJson: string;
}
export class PipelineSourceUpdateRequest extends OmitType(PipelineSourceRequest, ['id'] as const) {}

export class BindingParticipantRequest {
  @ApiProperty()
  @IsString()
  bindingKey: string;

  @ApiProperty()
  @IsString()
  runnerId: string;

  @ApiProperty()
  @IsString()
  modelLevel: string;

  @ApiProperty()
  @IsString()
  permissionMode: string;

  @ApiProperty()
  @IsNumber()
  timeoutMs: number;
}

export class LaunchBindingRequest {
  @ApiProperty()
  @IsString()
  slotId: string;

  @ApiProperty({ enum: ['single', 'consensus'] })
  @IsIn(['single', 'consensus'])
  strategy: 'single' | 'consensus';

  @ApiProperty({ type: [BindingParticipantRequest] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BindingParticipantRequest)
  participants: BindingParticipantRequest[];
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
  status: 'active' | 'deprecated';

  @ApiProperty({ type: [LaunchBindingRequest] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LaunchBindingRequest)
  bindings: LaunchBindingRequest[];
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
  @ApiProperty({ type: [PipelineSourceRequest], required: false })
  pipeline_sources?: PipelineSourceRequest[];
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
