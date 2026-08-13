import type { IPaginatedType } from '@revisium/engine';

import type { CreateWorkPlanCommandReturnType } from '../../commands/impl/create-work-plan.command.js';
import type { RecordListData } from '../../commands/utils/getOffsetPagination.js';

export type ListWorkPlansQueryData = RecordListData & {
  readonly projectId: string;
};

export type ListWorkPlansQueryReturnType = IPaginatedType<CreateWorkPlanCommandReturnType>;

export class ListWorkPlansQuery {
  constructor(readonly data: ListWorkPlansQueryData) {}
}
