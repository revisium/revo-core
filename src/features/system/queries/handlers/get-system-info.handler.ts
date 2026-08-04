import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import {
  GetSystemInfoQuery,
  type GetSystemInfoQueryReturnType,
} from '../impl/get-system-info.query.js';

@QueryHandler(GetSystemInfoQuery)
export class GetSystemInfoHandler implements IQueryHandler<
  GetSystemInfoQuery,
  GetSystemInfoQueryReturnType
> {
  execute(): Promise<GetSystemInfoQueryReturnType> {
    return Promise.resolve({ name: 'revo-core', status: 'ok' });
  }
}
