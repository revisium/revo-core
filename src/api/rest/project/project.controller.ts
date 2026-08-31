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

import { ProjectError } from '../../../features/project/contracts/project.errors.js';
import { ProjectApiService } from '../../../features/project/project-api.service.js';
import { ProjectCreateRequest } from './dto/project-create.request.js';
import { ProjectConnectionResponse } from './model/project-connection.response.js';
import { ProjectResponse } from './model/project.response.js';
import { recordListQuery } from './record-list.query.js';

@ApiTags('Projects')
@Controller('projects')
@UsePipes(new ValidationPipe())
export class ProjectController {
  constructor(private readonly projects: ProjectApiService) {}

  @Post()
  @ApiOperation({ operationId: 'createProject', summary: 'Create a project' })
  @ApiCreatedResponse({ type: ProjectResponse })
  createProject(@Body() data: ProjectCreateRequest): Promise<ProjectResponse> {
    return this.projects.createUserProject(data);
  }

  @Get()
  @ApiOperation({ operationId: 'listProjects', summary: 'List projects' })
  @ApiQuery({ name: 'first', type: Number, required: true })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiOkResponse({ type: ProjectConnectionResponse })
  listProjects(@Query('first', ParseIntPipe) first: number, @Query('after') after?: string) {
    return this.projects.listUserProjects(recordListQuery(first, after));
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteProject', summary: 'Delete a project' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: ProjectError.notFound })
  async deleteProject(@Param('id') id: string): Promise<void> {
    await this.projects.deleteUserProject(id);
  }
}
