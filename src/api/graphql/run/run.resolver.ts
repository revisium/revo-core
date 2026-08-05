import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { RunSnapshot } from '@revisium/revo-run';

import { RunApiService } from '../../../features/run/run-api.service.js';
import { StartRunInput } from './input/start-run.input.js';
import { RunModel } from './model/run.model.js';
import { StartRunResultModel } from './model/start-run-result.model.js';

@Resolver(() => RunModel)
export class RunResolver {
  constructor(private readonly runs: RunApiService) {}

  @Mutation(() => StartRunResultModel)
  startRun(
    @Args('data', { type: () => StartRunInput }) data: StartRunInput,
  ): Promise<StartRunResultModel> {
    return this.runs.startRun(data);
  }

  @Query(() => RunModel, { nullable: true })
  run(@Args('id', { type: () => ID }) id: string): Promise<RunSnapshot | undefined> {
    return this.runs.getRun({ runId: id });
  }
}
