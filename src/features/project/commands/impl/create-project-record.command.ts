import type { ContentTableId, ProjectRecordData } from '../../project-records.js';

export type CreateProjectRecordCommandData = {
  readonly projectId: string;
  readonly tableId: ContentTableId;
  readonly rowId: string;
  readonly data: ProjectRecordData;
};

export type CreateProjectRecordCommandReturnType = {
  readonly id: string;
  readonly data: unknown;
};

export class CreateProjectRecordCommand {
  constructor(readonly data: CreateProjectRecordCommandData) {}
}
