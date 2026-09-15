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
import { ProjectPublicMessage } from '../../errors/public-error-definitions.js';
import { WorkItemUpdateRequest } from './dto/work-item-update.request.js';
import { WorkItemRequest } from './dto/work-item.request.js';
import { WorkItemConnectionResponse } from './model/work-item-connection.response.js';
import { WorkItemResponse } from './model/work-item.response.js';
import { recordListQuery } from './record-list.query.js';
import { workItemCreateBody, workItemUpdateBody } from './record-write.js';

@ApiTags('Projects')
@Controller('projects/:projectId/work-items')
@UsePipes(new ValidationPipe())
export class WorkItemController {
  constructor(private readonly projects: ProjectApiService) {}

  @Post()
  @ApiOperation({ operationId: 'createWorkItem', summary: 'Create a work item' })
  @ApiCreatedResponse({ type: WorkItemResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  createWorkItem(@Param('projectId') projectId: string, @Body() data: WorkItemRequest) {
    return this.projects.createWorkItem(workItemCreateBody(projectId, data));
  }

  @Get()
  @ApiOperation({ operationId: 'listWorkItems', summary: 'List work items' })
  @ApiQuery({ name: 'first', type: Number, required: false })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiOkResponse({ type: WorkItemConnectionResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  listWorkItems(
    @Param('projectId') projectId: string,
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
  ) {
    return this.projects.listWorkItems(projectId, recordListQuery(first, after));
  }

  @Get(':workItemId')
  @ApiOperation({ operationId: 'getWorkItem', summary: 'Get a work item' })
  @ApiOkResponse({ type: WorkItemResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  async getWorkItem(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ) {
    const workItem = await this.projects.getWorkItem(projectId, workItemId);
    if (workItem === null) {
      throw new ProjectApplicationError(ProjectErrorCode.recordNotFound);
    }

    return workItem;
  }

  @Put(':workItemId')
  @ApiOperation({ operationId: 'updateWorkItem', summary: 'Replace a work item' })
  @ApiOkResponse({ type: WorkItemResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  updateWorkItem(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
    @Body() data: WorkItemUpdateRequest,
  ) {
    return this.projects.updateWorkItem(workItemUpdateBody(projectId, workItemId, data));
  }

  @Delete(':workItemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteWorkItem', summary: 'Delete a work item' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  async deleteWorkItem(
    @Param('projectId') projectId: string,
    @Param('workItemId') workItemId: string,
  ): Promise<void> {
    await this.projects.deleteWorkItem({ projectId, id: workItemId });
  }
}
