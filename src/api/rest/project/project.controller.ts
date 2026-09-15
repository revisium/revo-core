import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';

import {
  ProjectApplicationError,
  ProjectErrorCode,
} from '../../../features/project/contracts/project.errors.js';
import { ProjectApiService } from '../../../features/project/project-api.service.js';
import { ProjectPublicMessage } from '../../errors/public-error-definitions.js';
import { ProjectCreateRequest } from './dto/project-create.request.js';
import { ProjectUpdateRequest } from './dto/project-update.request.js';
import { ProjectActiveRunsErrorResponse } from './model/project-active-runs-error.response.js';
import { ProjectConnectionResponse } from './model/project-connection.response.js';
import { ProjectCreatedResponse } from './model/project-created.response.js';
import { ProjectNotActiveErrorResponse } from './model/project-not-active-error.response.js';
import { ProjectResponse } from './model/project.response.js';
import { projectListQuery } from './project-list.query.js';
import { projectUpdateBody } from './project-update.body.js';

@ApiTags('Projects')
@ApiExtraModels(ProjectNotActiveErrorResponse, ProjectActiveRunsErrorResponse)
@Controller('projects')
@UsePipes(new ValidationPipe())
export class ProjectController {
  constructor(private readonly projects: ProjectApiService) {}

  @Post()
  @ApiOperation({ operationId: 'createProject', summary: 'Create a project' })
  @ApiCreatedResponse({ type: ProjectCreatedResponse })
  createProject(@Body() data: ProjectCreateRequest): Promise<ProjectCreatedResponse> {
    return this.projects.createUserProject(data);
  }

  @Get()
  @ApiOperation({ operationId: 'listProjects', summary: 'List projects' })
  @ApiQuery({ name: 'first', schema: { type: 'integer' }, required: false })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiQuery({ name: 'includeArchived', type: Boolean, required: false })
  @ApiQuery({ name: 'query', type: String, required: false })
  @ApiOkResponse({ type: ProjectConnectionResponse })
  listProjects(
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
    @Query('includeArchived', new ParseBoolPipe({ optional: true })) includeArchived?: boolean,
    @Query('query') query?: string,
  ) {
    return this.projects.listUserProjects(
      projectListQuery({ first, after, includeArchived, query }),
    );
  }

  @Get(':id')
  @ApiOperation({ operationId: 'getProject', summary: 'Get a project' })
  @ApiOkResponse({ type: ProjectResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  async getProject(@Param('id') id: string): Promise<ProjectResponse> {
    const project = await this.projects.getUserProject(id);

    if (project === null) {
      throw new ProjectApplicationError(ProjectErrorCode.notFound);
    }

    return project;
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'archiveProject', summary: 'Archive a project' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  @ApiConflictResponse({
    description: 'Project is not active or has active runs.',
    schema: {
      oneOf: [
        { $ref: getSchemaPath(ProjectNotActiveErrorResponse) },
        { $ref: getSchemaPath(ProjectActiveRunsErrorResponse) },
      ],
    },
  })
  async archiveProject(@Param('id') id: string): Promise<void> {
    await this.projects.archiveUserProject({ projectId: id });
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/json')
  @ApiOperation({ operationId: 'restoreProject', summary: 'Restore an archived project' })
  @ApiOkResponse({ type: Boolean })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  @ApiConflictResponse({ description: ProjectPublicMessage.notArchived })
  restoreProject(@Param('id') id: string): Promise<boolean> {
    return this.projects.restoreUserProject({ projectId: id });
  }

  @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'updateProject', summary: 'Update a project' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: ProjectPublicMessage.updateBodyInvalid })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  @ApiConflictResponse({ description: ProjectPublicMessage.notActive })
  async updateProject(@Param('id') id: string, @Body() data: ProjectUpdateRequest): Promise<void> {
    await this.projects.updateUserProject(projectUpdateBody(id, data));
  }
}
