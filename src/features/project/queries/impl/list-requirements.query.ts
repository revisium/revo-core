import type { IPaginatedType } from '@revisium/engine';

import type { PageDataType } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import type { CreateRequirementCommandReturnType } from '../../commands/impl/create-requirement.command.js';

export type ListRequirementsQueryData = PageDataType & {
  readonly projectId: string;
};

export type ListRequirementsQueryReturnType = IPaginatedType<CreateRequirementCommandReturnType>;

export class ListRequirementsQuery {
  constructor(readonly data: ListRequirementsQueryData) {}
}
