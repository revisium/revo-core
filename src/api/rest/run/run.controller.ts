import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { RunEventPage } from '@revisium/revo-run';

import { RunPublicError } from '../../../features/run/contracts/run.errors.js';
import { RunApiService } from '../../../features/run/run-api.service.js';
import { START_RUN_REQUEST_SCHEMA, StartRunRequest } from './dto/start-run.request.js';
import { RunConnectionResponse } from './model/run-connection.response.js';
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

  @Get()
  @ApiOperation({ operationId: 'listRuns', summary: 'List project runs' })
  @ApiQuery({ name: 'projectId', type: String, required: true })
  @ApiQuery({ name: 'statuses', type: String, required: false })
  @ApiQuery({ name: 'first', schema: { type: 'integer' }, required: false })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiOkResponse({ type: RunConnectionResponse })
  listRuns(
    @Query('projectId') projectId: string | undefined,
    @Query('statuses') statuses: string | string[] | undefined,
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
  ) {
    const parsedStatuses = parseStatuses(statuses);

    return this.runs.listRuns({
      projectId: projectId ?? '',
      ...(parsedStatuses === undefined ? {} : { statuses: parsedStatuses }),
      ...(first === undefined ? {} : { first }),
      ...(after === undefined ? {} : { after }),
    });
  }

  @Get(':runId/details')
  @ApiOperation({ operationId: 'getRunDetails', summary: 'Get run details' })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: 'Run not found' })
  async getRunDetails(@Param('runId') runId: string) {
    const details = await this.runs.getRunDetails({ runId });

    if (details === undefined) {
      throw new NotFoundException(`Run ${runId} was not found.`);
    }

    return details;
  }

  @Get(':runId/events')
  @ApiOperation({ operationId: 'getRunEvents', summary: 'Get run events' })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: 'Run not found' })
  getRunEvents(@Param('runId') runId: string): Promise<RunEventPage> {
    return this.runs.getRunEvents({ runId });
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

function parseStatuses(statuses: string | string[] | undefined): readonly string[] | undefined {
  if (statuses === undefined) {
    return undefined;
  }

  if (Array.isArray(statuses) || statuses.length === 0) {
    throw RunPublicError.statusesInvalid();
  }

  return statuses.split(',');
}
