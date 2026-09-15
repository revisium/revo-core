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
import { AdrUpdateRequest } from './dto/adr-update.request.js';
import { AdrRequest } from './dto/adr.request.js';
import { AdrConnectionResponse } from './model/adr-connection.response.js';
import { AdrResponse } from './model/adr.response.js';
import { recordListQuery } from './record-list.query.js';
import { adrCreateBody, adrUpdateBody } from './record-write.js';

@ApiTags('Projects')
@Controller('projects/:projectId/adrs')
@UsePipes(new ValidationPipe())
export class AdrController {
  constructor(private readonly projects: ProjectApiService) {}

  @Post()
  @ApiOperation({ operationId: 'createAdr', summary: 'Create an ADR' })
  @ApiCreatedResponse({ type: AdrResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  createAdr(@Param('projectId') projectId: string, @Body() data: AdrRequest) {
    return this.projects.createAdr(adrCreateBody(projectId, data));
  }

  @Get()
  @ApiOperation({ operationId: 'listAdrs', summary: 'List ADRs' })
  @ApiQuery({ name: 'first', type: Number, required: false })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiOkResponse({ type: AdrConnectionResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.notFound })
  listAdrs(
    @Param('projectId') projectId: string,
    @Query('first', new ParseIntPipe({ optional: true })) first?: number,
    @Query('after') after?: string,
  ) {
    return this.projects.listAdrs(projectId, recordListQuery(first, after));
  }

  @Get(':adrId')
  @ApiOperation({ operationId: 'getAdr', summary: 'Get an ADR' })
  @ApiOkResponse({ type: AdrResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  async getAdr(@Param('projectId') projectId: string, @Param('adrId') adrId: string) {
    const adr = await this.projects.getAdr(projectId, adrId);
    if (adr === null) {
      throw new ProjectApplicationError({ code: ProjectErrorCode.recordNotFound, details: {} });
    }

    return adr;
  }

  @Put(':adrId')
  @ApiOperation({ operationId: 'updateAdr', summary: 'Replace an ADR' })
  @ApiOkResponse({ type: AdrResponse })
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  updateAdr(
    @Param('projectId') projectId: string,
    @Param('adrId') adrId: string,
    @Body() data: AdrUpdateRequest,
  ) {
    return this.projects.updateAdr(adrUpdateBody(projectId, adrId, data));
  }

  @Delete(':adrId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteAdr', summary: 'Delete an ADR' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: ProjectPublicMessage.recordNotFound })
  async deleteAdr(
    @Param('projectId') projectId: string,
    @Param('adrId') adrId: string,
  ): Promise<void> {
    await this.projects.deleteAdr({ projectId, id: adrId });
  }
}
