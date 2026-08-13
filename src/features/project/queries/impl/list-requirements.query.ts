import type { IPaginatedType } from '@revisium/engine';

import type { RecordListData } from '../../get-offset-pagination.js';
import type { Requirement } from '../../requirement.js';

export type ListRequirementsQueryData = RecordListData & {
  readonly projectId: string;
};

export type ListRequirementsQueryReturnType = IPaginatedType<Requirement>;

export class ListRequirementsQuery {
  constructor(readonly data: ListRequirementsQueryData) {}
}
