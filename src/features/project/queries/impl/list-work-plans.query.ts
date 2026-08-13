import type { IPaginatedType } from '@revisium/engine';

import type { RecordListData } from '../../get-offset-pagination.js';
import type { WorkPlan } from '../../work-plan.js';

export type ListWorkPlansQueryData = RecordListData & {
  readonly projectId: string;
};

export type ListWorkPlansQueryReturnType = IPaginatedType<WorkPlan>;

export class ListWorkPlansQuery {
  constructor(readonly data: ListWorkPlansQueryData) {}
}
