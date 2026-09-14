import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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
import { CreateWorkspaceResultResponse } from './model/create-workspace-result.response.js';
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
  list(
    @Param('projectId') projectId: string,
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
  ) {
    return this.api.listWorkspaces({
      projectId,
      ...(first === undefined ? {} : { first }),
      ...(after === undefined ? {} : { after }),
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
  @ApiCreatedResponse({ type: CreateWorkspaceResultResponse })
  create(@Param('projectId') projectId: string, @Body() data: CreateWorkspaceRequest) {
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
  @ApiOkResponse({ type: Boolean })
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() data: UpdateWorkspaceRequest,
  ) {
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
  @ApiOkResponse({ type: Boolean })
  archive(@Param('projectId') projectId: string, @Param('id') id: string) {
    return this.api.archiveWorkspace({ projectId, id });
  }
}
