import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import {
  ProjectApplicationError,
  ProjectErrorCode,
} from '../../../features/project/contracts/project.errors.js';
import { ProjectApiService } from '../../../features/project/project-api.service.js';
import { ProjectPublicMessage } from '../../errors/project-public-messages.js';
import { WorkPlanUpdateRequest } from './dto/work-plan-update.request.js';
import { WorkPlanRequest } from './dto/work-plan.request.js';
import { WorkPlanConnectionResponse } from './model/work-plan-connection.response.js';
import { WorkPlanResponse } from './model/work-plan.response.js';
import { recordListQuery } from './record-list.query.js';
import { workPlanCreateBody, workPlanUpdateBody } from './record-write.js';

@ApiTags('Projects')
@Controller('projects/:projectId/work-plans')
@UsePipes(new ValidationPipe())
export class WorkPlanController {
  constructor(private readonly projects: ProjectApiService) {}

  @Post()
  @ApiOperation({ operationId: 'createWorkPlan', summary: 'Create a work plan' })
  @ApiCreatedResponse({ type: WorkPlanResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  createWorkPlan(@Param('projectId') projectId: string, @Body() data: WorkPlanRequest) {
    return this.projects.createWorkPlan(workPlanCreateBody(projectId, data));
  }

  @Get()
  @ApiOperation({ operationId: 'listWorkPlans', summary: 'List work plans' })
  @ApiQuery({ name: 'first', type: Number, required: false })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiOkResponse({ type: WorkPlanConnectionResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  listWorkPlans(
    @Param('projectId') projectId: string,
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
  ) {
    return this.projects.listWorkPlans(projectId, recordListQuery(first, after));
  }

  @Get(':workPlanId')
  @ApiOperation({ operationId: 'getWorkPlan', summary: 'Get a work plan' })
  @ApiOkResponse({ type: WorkPlanResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  async getWorkPlan(
    @Param('projectId') projectId: string,
    @Param('workPlanId') workPlanId: string,
  ) {
    const workPlan = await this.projects.getWorkPlan(projectId, workPlanId);
    if (workPlan === null) {
      throw new ProjectApplicationError({ code: ProjectErrorCode.recordNotFound, details: {} });
    }

    return workPlan;
  }

  @Put(':workPlanId')
  @ApiOperation({ operationId: 'updateWorkPlan', summary: 'Replace a work plan' })
  @ApiOkResponse({ type: WorkPlanResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  updateWorkPlan(
    @Param('projectId') projectId: string,
    @Param('workPlanId') workPlanId: string,
    @Body() data: WorkPlanUpdateRequest,
  ) {
    return this.projects.updateWorkPlan(workPlanUpdateBody(projectId, workPlanId, data));
  }

  @Delete(':workPlanId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteWorkPlan', summary: 'Delete a work plan' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  async deleteWorkPlan(
    @Param('projectId') projectId: string,
    @Param('workPlanId') workPlanId: string,
  ): Promise<void> {
    await this.projects.deleteWorkPlan({ projectId, id: workPlanId });
  }
}
