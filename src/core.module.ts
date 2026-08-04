import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';

import { GraphqlApiModule } from './api/graphql/graphql-api.module.js';
import { RestApiModule } from './api/rest/rest-api.module.js';

@Module({
  imports: [
    GraphqlApiModule,
    RestApiModule,
    RouterModule.register([{ path: '/api', module: RestApiModule }]),
  ],
})
export class CoreModule {}
