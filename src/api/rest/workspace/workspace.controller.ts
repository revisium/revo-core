import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { WorkspaceApiService } from '../../../features/workspace/workspace-api.service.js';
import { CreateWorkspaceRequest } from './model/create-workspace.request.js';
import { UpdateWorkspaceRequest } from './model/update-workspace.request.js';
import { WorkspaceCheckResponse } from './model/workspace-check.response.js';
import { WorkspaceConnectionResponse } from './model/workspace-connection.response.js';
import { WorkspaceResponse } from './model/workspace.response.js';

@ApiTags('Workspace')
@Controller('projects/:projectId/workspaces')
export class WorkspaceController {
  constructor(private readonly api: WorkspaceApiService) {}

  @Get()
  @ApiOperation({ operationId: 'listWorkspaces' })
  @ApiOkResponse({ type: WorkspaceConnectionResponse })
  @ApiQuery({ name: 'first', required: false, type: Number })
  @ApiQuery({ name: 'after', required: false, type: String })
  @ApiQuery({ name: 'includeArchived', required: false, type: Boolean })
  list(
    @Param('projectId') projectId: string,
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived?: boolean,
  ) {
    return this.api.listWorkspaces({
      projectId,
      ...(first === undefined ? {} : { first }),
      ...(after === undefined ? {} : { after }),
      ...(includeArchived === undefined ? {} : { includeArchived }),
    });
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getWorkspace' })
  @ApiOkResponse({ type: WorkspaceResponse })
  get(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.api.getWorkspace({ projectId, id });
  }

  @Post()
  @ApiOperation({ operationId: 'createWorkspace' })
  @ApiCreatedResponse({ type: WorkspaceResponse })
  create(@Param('projectId') projectId: string, @Body() data: CreateWorkspaceRequest) {
    if (data === null) {
      throw new BadRequestException();
    }

    return this.api.createWorkspace({
      projectId,
      name: data?.name,
      ...(data?.description === undefined ? {} : { description: data.description }),
      type: data?.type,
      sourcePath: data?.sourcePath,
    });
  }

  @Patch(':id')
  @ApiOperation({ operationId: 'updateWorkspace' })
  @ApiOkResponse({ type: WorkspaceResponse })
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() data: UpdateWorkspaceRequest,
  ) {
    if (data === null) {
      throw new BadRequestException();
    }

    return this.api.updateWorkspace({
      projectId,
      id,
      ...(data?.name === undefined ? {} : { name: data.name }),
      ...(data?.description === undefined ? {} : { description: data.description }),
      ...(data?.sourcePath === undefined ? {} : { sourcePath: data.sourcePath }),
    });
  }

  @Post(':id/check')
  @HttpCode(200)
  @ApiOperation({ operationId: 'checkWorkspace' })
  @ApiOkResponse({ type: WorkspaceCheckResponse })
  check(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.api.checkWorkspace({ projectId, id });
  }

  @Post(':id/archive')
  @HttpCode(200)
  @ApiOperation({ operationId: 'archiveWorkspace' })
  @ApiOkResponse({ type: WorkspaceResponse })
  archive(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.api.archiveWorkspace({ projectId, id });
  }

  @Post(':id/restore')
  @HttpCode(200)
  @ApiOperation({ operationId: 'restoreWorkspace' })
  @ApiOkResponse({ type: WorkspaceResponse })
  restore(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.api.restoreWorkspace({ projectId, id });
  }
}
