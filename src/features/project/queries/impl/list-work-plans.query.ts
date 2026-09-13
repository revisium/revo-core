import type { IPaginatedType } from '@revisium/engine';

import type { PageDataType } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import type { CreateWorkPlanCommandReturnType } from '../../commands/impl/create-work-plan.command.js';

export type ListWorkPlansQueryData = PageDataType & {
  readonly projectId: string;
};

export type ListWorkPlansQueryReturnType = IPaginatedType<CreateWorkPlanCommandReturnType>;

export class ListWorkPlansQuery {
  constructor(readonly data: ListWorkPlansQueryData) {}
}
