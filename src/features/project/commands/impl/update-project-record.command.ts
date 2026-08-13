import type { ContentTableId, ProjectRecordData } from '../../project-records.js';

export type UpdateProjectRecordCommandData = {
  readonly projectId: string;
  readonly tableId: ContentTableId;
  readonly rowId: string;
  readonly data: ProjectRecordData;
};

export type UpdateProjectRecordCommandReturnType = {
  readonly id: string;
  readonly data: unknown;
};

export class UpdateProjectRecordCommand {
  constructor(readonly data: UpdateProjectRecordCommandData) {}
}
