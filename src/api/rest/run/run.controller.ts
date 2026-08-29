import { Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RunApiService } from '../../../features/run/run-api.service.js';
import { START_RUN_REQUEST_SCHEMA, StartRunRequest } from './dto/start-run.request.js';
import { RunResponse } from './model/run.response.js';
import { StartRunResponse } from './model/start-run.response.js';

@ApiTags('Runs')
@ApiExtraModels(StartRunRequest)
@Controller('runs')
export class RunController {
  constructor(private readonly runs: RunApiService) {}

  @Post()
  @ApiOperation({ operationId: 'startRun', summary: 'Start a run' })
  @ApiBody({ schema: START_RUN_REQUEST_SCHEMA })
  @ApiCreatedResponse({ type: StartRunResponse })
  startRun(@Body() data: StartRunRequest): Promise<StartRunResponse> {
    return this.runs.startRun(data);
  }

  @Get(':runId')
  @ApiOperation({ operationId: 'getRun', summary: 'Get a run' })
  @ApiOkResponse({ type: RunResponse })
  @ApiNotFoundResponse({ description: 'Run not found' })
  async getRun(@Param('runId') runId: string): Promise<RunResponse> {
    const run = await this.runs.getRun({ runId });

    if (run === undefined) {
      throw new NotFoundException(`Run ${runId} was not found.`);
    }

    return run;
  }
}
