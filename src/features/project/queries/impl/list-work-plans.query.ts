import type { IPaginatedType } from '@revisium/engine';

import type { CreateWorkPlanCommandReturnType } from '../../commands/impl/create-work-plan.command.js';
import type { PageDataType } from '../../commands/utils/getOffsetPagination.js';

export type ListWorkPlansQueryData = PageDataType & {
  readonly projectId: string;
};

export type ListWorkPlansQueryReturnType = IPaginatedType<CreateWorkPlanCommandReturnType>;

export class ListWorkPlansQuery {
  constructor(readonly data: ListWorkPlansQueryData) {}
}
