import { ApiProperty } from '@nestjs/swagger';

export class CatalogRecordResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  revisionId: string;

  @ApiProperty()
  isHead: boolean;
}

export class PlaybookResponse extends CatalogRecordResponse {
  @ApiProperty()
  name: string;
}
export class RoleResponse extends CatalogRecordResponse {
  @ApiProperty()
  playbookId: string;
  @ApiProperty()
  body: string;
}
export class RoleRefResponse extends CatalogRecordResponse {
  @ApiProperty()
  roleId: string;
  @ApiProperty()
  body: string;
}
export class SharedReferenceResponse extends CatalogRecordResponse {
  @ApiProperty()
  playbookId: string;
  @ApiProperty()
  body: string;
}
export class StackResponse extends CatalogRecordResponse {
  @ApiProperty()
  playbookId: string;
  @ApiProperty()
  body: string;
}
export class StackRefResponse extends CatalogRecordResponse {
  @ApiProperty()
  stackId: string;
  @ApiProperty()
  body: string;
}
export class MethodDocumentResponse extends CatalogRecordResponse {
  @ApiProperty()
  playbookId: string;
  @ApiProperty({ enum: ['method', 'template', 'checklist', 'nav'] })
  kind: 'method' | 'template' | 'checklist' | 'nav';
  @ApiProperty()
  body: string;
}
export class PipelineResponse extends CatalogRecordResponse {
  @ApiProperty()
  playbookId: string;
  @ApiProperty()
  body: string;
  @ApiProperty({ example: 'Not launchable' })
  launchability: string;
}
export class PipelineRoleResponse extends CatalogRecordResponse {
  @ApiProperty()
  pipelineId: string;
  @ApiProperty()
  roleId: string;
  @ApiProperty({ enum: ['required', 'optional', 'alternative'] })
  membership: 'required' | 'optional' | 'alternative';
}
export class PipelineSourceResponse extends CatalogRecordResponse {
  @ApiProperty()
  pipelineId: string;
  @ApiProperty()
  sourceJson: string;
}
export class PipelineSlotResponse extends CatalogRecordResponse {
  @ApiProperty()
  pipelineId: string;
  @ApiProperty()
  sourceId: string;
  @ApiProperty()
  slotKey: string;
  @ApiProperty()
  sourcePath: string;
  @ApiProperty({ enum: ['single', 'consensus'], isArray: true })
  strategies: Array<'single' | 'consensus'>;
}
export class BindingParticipantResponse {
  @ApiProperty()
  bindingKey: string;
  @ApiProperty()
  runnerId: string;
  @ApiProperty()
  modelLevel: string;
  @ApiProperty()
  permissionMode: string;
  @ApiProperty()
  timeoutMs: number;
}
export class LaunchBindingResponse {
  @ApiProperty()
  slotId: string;
  @ApiProperty({ enum: ['single', 'consensus'] })
  strategy: 'single' | 'consensus';
  @ApiProperty({ type: [BindingParticipantResponse] })
  participants: BindingParticipantResponse[];
}
export class LaunchProfileResponse extends CatalogRecordResponse {
  @ApiProperty()
  pipelineId: string;
  @ApiProperty({ enum: ['active', 'deprecated'] })
  status: 'active' | 'deprecated';
  @ApiProperty({ type: [LaunchBindingResponse] })
  bindings: LaunchBindingResponse[];
}

export class CatalogPageInfoResponse {
  @ApiProperty({ required: false })
  startCursor?: string;
  @ApiProperty({ required: false })
  endCursor?: string;
  @ApiProperty()
  hasNextPage: boolean;
  @ApiProperty()
  hasPreviousPage: boolean;
}

function catalogConnection<T>(nodeType: new (...args: never[]) => T, name: string) {
  class CatalogEdgeResponse {
    @ApiProperty()
    cursor: string;

    @ApiProperty({ type: nodeType })
    node: T;
  }
  Object.defineProperty(CatalogEdgeResponse, 'name', { value: `${name}EdgeResponse` });

  class CatalogTypedConnectionResponse {
    @ApiProperty({ type: [CatalogEdgeResponse] })
    edges: CatalogEdgeResponse[];

    @ApiProperty()
    totalCount: number;

    @ApiProperty({ type: CatalogPageInfoResponse })
    pageInfo: CatalogPageInfoResponse;
  }
  Object.defineProperty(CatalogTypedConnectionResponse, 'name', {
    value: `${name}ConnectionResponse`,
  });
  return CatalogTypedConnectionResponse;
}

export const PlaybookConnectionResponse = catalogConnection(PlaybookResponse, 'Playbook');
export const RoleConnectionResponse = catalogConnection(RoleResponse, 'Role');
export const RoleRefConnectionResponse = catalogConnection(RoleRefResponse, 'RoleRef');
export const SharedReferenceConnectionResponse = catalogConnection(
  SharedReferenceResponse,
  'SharedReference',
);
export const StackConnectionResponse = catalogConnection(StackResponse, 'Stack');
export const StackRefConnectionResponse = catalogConnection(StackRefResponse, 'StackRef');
export const MethodDocumentConnectionResponse = catalogConnection(
  MethodDocumentResponse,
  'MethodDocument',
);
export const PipelineConnectionResponse = catalogConnection(PipelineResponse, 'Pipeline');
export const PipelineRoleConnectionResponse = catalogConnection(
  PipelineRoleResponse,
  'PipelineRole',
);
export const PipelineSourceConnectionResponse = catalogConnection(
  PipelineSourceResponse,
  'PipelineSource',
);
export const PipelineSlotConnectionResponse = catalogConnection(
  PipelineSlotResponse,
  'PipelineSlot',
);
export const LaunchProfileConnectionResponse = catalogConnection(
  LaunchProfileResponse,
  'LaunchProfile',
);

export class CatalogStatusResponse {
  @ApiProperty()
  headRevisionId: string;
  @ApiProperty()
  draftRevisionId: string;
  @ApiProperty()
  hasChanges: boolean;
  @ApiProperty()
  totalChanges: number;
}

export class CatalogChangeEntryResponse {
  @ApiProperty()
  entryId: string;
  @ApiProperty({
    enum: [
      'playbooks',
      'roles',
      'shared_references',
      'stacks',
      'method_documents',
      'pipelines',
      'role_refs',
      'stack_refs',
      'pipeline_roles',
      'pipeline_sources',
      'pipeline_slots',
      'launch_profiles',
    ],
  })
  tableId: string;
  @ApiProperty()
  recordId: string;
  @ApiProperty({ required: false })
  previousRecordId?: string;
  @ApiProperty({ enum: ['ADDED', 'MODIFIED', 'REMOVED', 'RENAMED', 'RENAMED_AND_MODIFIED'] })
  changeType: string;
  @ApiProperty({ type: [String] })
  fieldPaths: string[];
}

export const CatalogChangeConnectionResponse = catalogConnection(
  CatalogChangeEntryResponse,
  'CatalogChange',
);

export class CatalogMutationResultResponse {
  @ApiProperty({ type: CatalogStatusResponse })
  status: CatalogStatusResponse;
  @ApiProperty({ type: CatalogChangeConnectionResponse })
  changes: InstanceType<typeof CatalogChangeConnectionResponse>;
}

export class CatalogCommitResultResponse {
  @ApiProperty()
  revisionId: string;
  @ApiProperty()
  previousRevisionId: string;
}

export class CatalogImportTableResultResponse {
  @ApiProperty()
  tableId: string;
  @ApiProperty()
  created: number;
  @ApiProperty()
  updated: number;
}
export class CatalogImportResultResponse {
  @ApiProperty({ type: [CatalogImportTableResultResponse] })
  tables: CatalogImportTableResultResponse[];
}

export class CatalogSnapshotTablesResponse {
  @ApiProperty({ type: [PlaybookResponse] })
  playbooks: PlaybookResponse[];
  @ApiProperty({ type: [RoleResponse] })
  roles: RoleResponse[];
  @ApiProperty({ type: [SharedReferenceResponse] })
  shared_references: SharedReferenceResponse[];
  @ApiProperty({ type: [StackResponse] })
  stacks: StackResponse[];
  @ApiProperty({ type: [MethodDocumentResponse] })
  method_documents: MethodDocumentResponse[];
  @ApiProperty({ type: [PipelineResponse] })
  pipelines: PipelineResponse[];
  @ApiProperty({ type: [RoleRefResponse] })
  role_refs: RoleRefResponse[];
  @ApiProperty({ type: [StackRefResponse] })
  stack_refs: StackRefResponse[];
  @ApiProperty({ type: [PipelineRoleResponse] })
  pipeline_roles: PipelineRoleResponse[];
  @ApiProperty({ type: [PipelineSourceResponse] })
  pipeline_sources: PipelineSourceResponse[];
  @ApiProperty({ type: [PipelineSlotResponse] })
  pipeline_slots: PipelineSlotResponse[];
  @ApiProperty({ type: [LaunchProfileResponse] })
  launch_profiles: LaunchProfileResponse[];
}

export class CatalogSnapshotResponse {
  @ApiProperty()
  revisionId: string;
  @ApiProperty()
  isHead: boolean;
  @ApiProperty({ type: CatalogSnapshotTablesResponse })
  tables: CatalogSnapshotTablesResponse;
}
