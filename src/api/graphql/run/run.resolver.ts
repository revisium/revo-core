import { UseFilters } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';

import { RunApiService } from '../../../features/run/run-api.service.js';
import { StartRunInput } from './input/start-run.input.js';
import { RunModel } from './model/run.model.js';
import { StartRunResultModel } from './model/start-run-result.model.js';
import { RunGraphqlExceptionFilter } from './run-graphql-exception.filter.js';

@Resolver(() => RunModel)
@UseFilters(RunGraphqlExceptionFilter)
export class RunResolver {
  constructor(private readonly runs: RunApiService) {}

  @Mutation(() => StartRunResultModel)
  startRun(
    @Args('data', { type: () => StartRunInput }) data: StartRunInput,
  ): Promise<StartRunResultModel> {
    return this.runs.startRun(data);
  }

  @Query(() => RunModel, { nullable: true })
  run(@Args('id', { type: () => ID }) id: string): Promise<RunModel | undefined> {
    return this.runs.getRun({ runId: id });
  }
}
