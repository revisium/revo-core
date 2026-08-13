import type { IPaginatedType } from '@revisium/engine';

import type { CreateRequirementCommandReturnType } from '../../commands/impl/create-requirement.command.js';
import type { PageDataType } from '../../commands/utils/getOffsetPagination.js';

export type ListRequirementsQueryData = PageDataType & {
  readonly projectId: string;
};

export type ListRequirementsQueryReturnType = IPaginatedType<CreateRequirementCommandReturnType>;

export class ListRequirementsQuery {
  constructor(readonly data: ListRequirementsQueryData) {}
}
