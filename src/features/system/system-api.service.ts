import { Injectable } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { GetSystemInfoQuery, type GetSystemInfoQueryReturnType } from './queries/index.js';

@Injectable()
export class SystemApiService {
  constructor(private readonly queries: QueryBus) {}

  getInfo() {
    return this.queries.execute<GetSystemInfoQuery, GetSystemInfoQueryReturnType>(
      new GetSystemInfoQuery(),
    );
  }
}
