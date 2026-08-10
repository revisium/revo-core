import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { REVIEW_COMMAND_HANDLERS } from './commands/index.js';
import { REVIEW_QUERY_HANDLERS } from './queries/index.js';
import { ReviewApiService } from './review-api.service.js';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [ReviewApiService, ...REVIEW_COMMAND_HANDLERS, ...REVIEW_QUERY_HANDLERS],
  exports: [ReviewApiService],
})
export class ReviewModule {}
