import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { ProjectError } from '../../../features/project/contracts/project.errors.js';
import { ProjectApiService } from '../../../features/project/project-api.service.js';
import { ProjectCreateRequest } from './dto/project-create.request.js';
import { ProjectConnectionResponse } from './model/project-connection.response.js';
import { ProjectCreatedResponse } from './model/project-created.response.js';
import { ProjectResponse } from './model/project.response.js';
import { projectListQuery } from './project-list.query.js';

@ApiTags('Projects')
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
  @ApiQuery({ name: 'first', type: Number, required: false })
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
  @ApiNotFoundResponse({ description: ProjectError.notFound })
  async getProject(@Param('id') id: string): Promise<ProjectResponse> {
    const project = await this.projects.getUserProject(id);

    if (project === null) {
      throw new NotFoundException(ProjectError.notFound);
    }

    return project;
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'archiveProject', summary: 'Archive a project' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: ProjectError.notFound })
  @ApiConflictResponse({ description: ProjectError.notActive })
  async archiveProject(@Param('id') id: string): Promise<void> {
    await this.projects.archiveUserProject({ projectId: id });
  }
}
