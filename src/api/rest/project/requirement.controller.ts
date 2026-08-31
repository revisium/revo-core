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

import { ProjectError } from '../../../features/project/contracts/project.errors.js';
import { ProjectApiService } from '../../../features/project/project-api.service.js';
import { RequirementUpdateRequest } from './dto/requirement-update.request.js';
import { RequirementRequest } from './dto/requirement.request.js';
import { RequirementConnectionResponse } from './model/requirement-connection.response.js';
import { RequirementResponse } from './model/requirement.response.js';
import { recordListQuery } from './record-list.query.js';
import { requirementCreateBody, requirementUpdateBody } from './record-write.js';

@ApiTags('Projects')
@Controller('projects/:projectId/requirements')
@UsePipes(new ValidationPipe())
export class RequirementController {
  constructor(private readonly projects: ProjectApiService) {}

  @Post()
  @ApiOperation({ operationId: 'createRequirement', summary: 'Create a requirement' })
  @ApiCreatedResponse({ type: RequirementResponse })
  @ApiNotFoundResponse({ description: ProjectError.notFound })
  createRequirement(@Param('projectId') projectId: string, @Body() data: RequirementRequest) {
    return this.projects.createRequirement(requirementCreateBody(projectId, data));
  }

  @Get()
  @ApiOperation({ operationId: 'listRequirements', summary: 'List requirements' })
  @ApiQuery({ name: 'first', type: Number, required: true })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiOkResponse({ type: RequirementConnectionResponse })
  @ApiNotFoundResponse({ description: ProjectError.notFound })
  listRequirements(
    @Param('projectId') projectId: string,
    @Query('first', ParseIntPipe) first: number,
    @Query('after') after?: string,
  ) {
    return this.projects.listRequirements(projectId, recordListQuery(first, after));
  }

  @Get(':requirementId')
  @ApiOperation({ operationId: 'getRequirement', summary: 'Get a requirement' })
  @ApiOkResponse({ type: RequirementResponse })
  @ApiNotFoundResponse({ description: ProjectError.recordNotFound })
  async getRequirement(
    @Param('projectId') projectId: string,
    @Param('requirementId') requirementId: string,
  ) {
    const requirement = await this.projects.getRequirement(projectId, requirementId);
    if (requirement === null) {
      throw new NotFoundException(ProjectError.recordNotFound);
    }

    return requirement;
  }

  @Put(':requirementId')
  @ApiOperation({ operationId: 'updateRequirement', summary: 'Replace a requirement' })
  @ApiOkResponse({ type: RequirementResponse })
  @ApiNotFoundResponse({ description: ProjectError.recordNotFound })
  updateRequirement(
    @Param('projectId') projectId: string,
    @Param('requirementId') requirementId: string,
    @Body() data: RequirementUpdateRequest,
  ) {
    return this.projects.updateRequirement(requirementUpdateBody(projectId, requirementId, data));
  }

  @Delete(':requirementId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteRequirement', summary: 'Delete a requirement' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: ProjectError.recordNotFound })
  async deleteRequirement(
    @Param('projectId') projectId: string,
    @Param('requirementId') requirementId: string,
  ): Promise<void> {
    await this.projects.deleteRequirement({ projectId, id: requirementId });
  }
}
