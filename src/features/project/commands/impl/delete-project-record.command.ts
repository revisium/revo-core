import type { ContentTableId } from '../../project-records.js';

export type DeleteProjectRecordCommandData = {
  readonly projectId: string;
  readonly tableId: ContentTableId;
  readonly rowId: string;
};

export type DeleteProjectRecordCommandReturnType = boolean;

export class DeleteProjectRecordCommand {
  constructor(readonly data: DeleteProjectRecordCommandData) {}
}
