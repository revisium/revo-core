import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { EngineModule } from '@revisium/engine';

import { GraphqlApiModule } from './api/graphql/graphql-api.module.js';
import { RestApiModule } from './api/rest/rest-api.module.js';
import { ReviewModule } from './features/review/review.module.js';
import { RevisiumBootstrapModule } from './features/revisium-bootstrap/revisium-bootstrap.module.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';

@Module({
  imports: [
    DatabaseModule,
    EngineModule.forRoot(),
    ReviewModule,
    RevisiumBootstrapModule,
    GraphqlApiModule,
    RestApiModule,
    RouterModule.register([{ path: '/api', module: RestApiModule }]),
  ],
})
export class CoreModule {}
