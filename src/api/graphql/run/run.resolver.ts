import { UseFilters } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { RunApiService } from '../../../features/run/run-api.service.js';
import { PublicHttpExceptionFilter } from '../public-http-exception.filter.js';
import { RunListInput } from './input/run-list.input.js';
import { StartRunInput } from './input/start-run.input.js';
import { RunConnectionModel } from './model/run-connection.model.js';
import { RunModel } from './model/run.model.js';
import { StartRunResultModel } from './model/start-run-result.model.js';

@Resolver(() => RunModel)
@UseFilters(PublicHttpExceptionFilter)
export class RunResolver {
  constructor(private readonly runApi: RunApiService) {}

  @Mutation(() => StartRunResultModel)
  startRun(
    @Args('data', { type: () => StartRunInput }) data: StartRunInput,
  ): Promise<StartRunResultModel> {
    return this.runApi.startRun(data);
  }

  @Query(() => RunModel, { nullable: true })
  run(@Args('id', { type: () => ID }) id: string): Promise<RunModel | undefined> {
    return this.runApi.getRun({ runId: id });
  }

  @Query(() => RunConnectionModel)
  runs(@Args('data', { type: () => RunListInput }) data: RunListInput) {
    return this.runApi.listRuns(data);
  }
}
