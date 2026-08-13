import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
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

import { ProjectError } from '../../../features/project/constants/project.constants.js';
import { ProjectApiService } from '../../../features/project/project-api.service.js';
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
  @ApiNotFoundResponse({ description: ProjectError.notFound })
  createWorkPlan(@Param('projectId') projectId: string, @Body() data: WorkPlanRequest) {
    return this.projects.createWorkPlan(workPlanCreateBody(projectId, data));
  }

  @Get()
  @ApiOperation({ operationId: 'listWorkPlans', summary: 'List work plans' })
  @ApiQuery({ name: 'first', type: Number, required: true })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiOkResponse({ type: WorkPlanConnectionResponse })
  @ApiNotFoundResponse({ description: ProjectError.notFound })
  listWorkPlans(
    @Param('projectId') projectId: string,
    @Query('first', ParseIntPipe) first: number,
    @Query('after') after?: string,
  ) {
    return this.projects.listWorkPlans(projectId, recordListQuery(first, after));
  }

  @Get(':workPlanId')
  @ApiOperation({ operationId: 'getWorkPlan', summary: 'Get a work plan' })
  @ApiOkResponse({ type: WorkPlanResponse })
  @ApiNotFoundResponse({ description: ProjectError.recordNotFound })
  async getWorkPlan(
    @Param('projectId') projectId: string,
    @Param('workPlanId') workPlanId: string,
  ) {
    const workPlan = await this.projects.getWorkPlan(projectId, workPlanId);
    if (workPlan === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return workPlan;
  }

  @Put(':workPlanId')
  @ApiOperation({ operationId: 'updateWorkPlan', summary: 'Replace a work plan' })
  @ApiOkResponse({ type: WorkPlanResponse })
  @ApiNotFoundResponse({ description: ProjectError.recordNotFound })
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
  @ApiNotFoundResponse({ description: ProjectError.recordNotFound })
  async deleteWorkPlan(
    @Param('projectId') projectId: string,
    @Param('workPlanId') workPlanId: string,
  ): Promise<void> {
    await this.projects.deleteWorkPlan({ projectId, id: workPlanId });
  }
}
