import type { IPaginatedType } from '@revisium/engine';

import type { PageDataType } from '../../../../infrastructure/pagination/get-offset-pagination.js';
import type { CreateAdrCommandReturnType } from '../../commands/impl/create-adr.command.js';

export type ListAdrsQueryData = PageDataType & {
  readonly projectId: string;
};

export type ListAdrsQueryReturnType = IPaginatedType<CreateAdrCommandReturnType>;

export class ListAdrsQuery {
  constructor(readonly data: ListAdrsQueryData) {}
}
