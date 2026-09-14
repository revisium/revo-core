import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { WorkspaceApiService } from '../../../features/workspace/workspace-api.service.js';
import { WorkspaceCheckRequest } from './model/workspace-check.request.js';
import { WorkspaceCheckResponse } from './model/workspace-check.response.js';

@ApiTags('Workspace')
@Controller('workspaces')
export class WorkspaceSourceController {
  constructor(private readonly api: WorkspaceApiService) {}

  @Post('check-source')
  @HttpCode(200)
  @ApiOperation({ operationId: 'checkWorkspaceSource' })
  @ApiOkResponse({ type: WorkspaceCheckResponse })
  checkSource(@Body() data: WorkspaceCheckRequest) {
    if (data === null) {
      throw new BadRequestException();
    }

    return this.api.checkWorkspaceSource({ type: data?.type, sourcePath: data?.sourcePath });
  }
}
