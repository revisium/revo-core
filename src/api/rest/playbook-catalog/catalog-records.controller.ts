import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { PlaybookCatalogApiService } from '../../../features/playbook-catalog/playbook-catalog-api.service.js';
import { catalogPage, catalogSelector } from './catalog-request.js';
import { ApiCatalogList, ApiCatalogScope } from './catalog-swagger.js';
import {
  LaunchProfileRequest,
  LaunchProfileUpdateRequest,
  MethodDocumentRequest,
  MethodDocumentUpdateRequest,
  PipelineRequest,
  PipelineRoleRequest,
  PipelineSourceUpdateRequest,
  PipelineUpdateRequest,
  PlaybookRequest,
  PlaybookUpdateRequest,
  RoleRefRequest,
  RoleRefUpdateRequest,
  RoleRequest,
  RoleUpdateRequest,
  SharedReferenceRequest,
  SharedReferenceUpdateRequest,
  StackRefRequest,
  StackRefUpdateRequest,
  StackRequest,
  StackUpdateRequest,
} from './dto/catalog-records.request.js';
import {
  LaunchProfileConnectionResponse,
  LaunchProfileResponse,
  MethodDocumentConnectionResponse,
  MethodDocumentResponse,
  PipelineConnectionResponse,
  PipelineResponse,
  PipelineRoleConnectionResponse,
  PipelineRoleResponse,
  PipelineSlotConnectionResponse,
  PipelineSlotResponse,
  PipelineSourceConnectionResponse,
  PipelineSourceResponse,
  PlaybookConnectionResponse,
  PlaybookResponse,
  RoleConnectionResponse,
  RoleRefConnectionResponse,
  RoleRefResponse,
  RoleResponse,
  SharedReferenceConnectionResponse,
  SharedReferenceResponse,
  StackConnectionResponse,
  StackRefConnectionResponse,
  StackRefResponse,
  StackResponse,
} from './model/catalog-records.response.js';

@ApiTags('Playbook Catalog')
@Controller('playbook-catalog')
@UsePipes(new ValidationPipe())
export class CatalogRecordsController {
  constructor(private readonly catalog: PlaybookCatalogApiService) {}

  @Get('playbooks')
  @ApiOperation({ operationId: 'listPlaybooks' })
  @ApiCatalogList()
  @ApiOkResponse({ type: PlaybookConnectionResponse })
  listPlaybooks(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listPlaybooks(catalogPage(first, after, scope, revisionId));
  }

  @Get('playbooks/:id')
  @ApiOperation({ operationId: 'getPlaybook' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: PlaybookResponse })
  getPlaybook(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getPlaybook(id, catalogSelector(scope, revisionId));
  }

  @Post('playbooks')
  @ApiOperation({ operationId: 'createPlaybook' })
  @ApiCreatedResponse({ type: PlaybookResponse })
  createPlaybook(@Body() data: PlaybookRequest) {
    return this.catalog.createPlaybook({ ...data });
  }

  @Put('playbooks/:id')
  @ApiOperation({ operationId: 'updatePlaybook' })
  @ApiOkResponse({ type: PlaybookResponse })
  updatePlaybook(@Param('id') id: string, @Body() data: PlaybookUpdateRequest) {
    return this.catalog.updatePlaybook({ id, ...data });
  }

  @Delete('playbooks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deletePlaybook' })
  @ApiNoContentResponse()
  deletePlaybook(@Param('id') id: string) {
    return this.catalog.deletePlaybook(id);
  }

  @Get('roles')
  @ApiOperation({ operationId: 'listRoles' })
  @ApiCatalogList()
  @ApiQuery({ name: 'playbookId', required: false })
  @ApiOkResponse({ type: RoleConnectionResponse })
  listRoles(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('playbookId') playbookId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listRoles({
      ...catalogPage(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Get('roles/:id')
  @ApiOperation({ operationId: 'getRole' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: RoleResponse })
  getRole(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getRole(id, catalogSelector(scope, revisionId));
  }

  @Post('roles')
  @ApiOperation({ operationId: 'createRole' })
  @ApiCreatedResponse({ type: RoleResponse })
  createRole(@Body() data: RoleRequest) {
    return this.catalog.createRole({ ...data });
  }

  @Put('roles/:id')
  @ApiOperation({ operationId: 'updateRole' })
  @ApiOkResponse({ type: RoleResponse })
  updateRole(@Param('id') id: string, @Body() data: RoleUpdateRequest) {
    return this.catalog.updateRole({ id, ...data });
  }

  @Delete('roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteRole' })
  @ApiNoContentResponse()
  deleteRole(@Param('id') id: string) {
    return this.catalog.deleteRole(id);
  }

  @Get('role-refs')
  @ApiOperation({ operationId: 'listRoleRefs' })
  @ApiCatalogList()
  @ApiQuery({ name: 'roleId', required: false })
  @ApiOkResponse({ type: RoleRefConnectionResponse })
  listRoleRefs(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('roleId') roleId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listRoleRefs({
      ...catalogPage(first, after, scope, revisionId),
      ...(roleId === undefined ? {} : { roleId }),
    });
  }

  @Get('role-refs/:id')
  @ApiOperation({ operationId: 'getRoleRef' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: RoleRefResponse })
  getRoleRef(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getRoleRef(id, catalogSelector(scope, revisionId));
  }

  @Post('role-refs')
  @ApiOperation({ operationId: 'createRoleRef' })
  @ApiCreatedResponse({ type: RoleRefResponse })
  createRoleRef(@Body() data: RoleRefRequest) {
    return this.catalog.createRoleRef({ ...data });
  }

  @Put('role-refs/:id')
  @ApiOperation({ operationId: 'updateRoleRef' })
  @ApiOkResponse({ type: RoleRefResponse })
  updateRoleRef(@Param('id') id: string, @Body() data: RoleRefUpdateRequest) {
    return this.catalog.updateRoleRef({ id, ...data });
  }

  @Delete('role-refs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteRoleRef' })
  @ApiNoContentResponse()
  deleteRoleRef(@Param('id') id: string) {
    return this.catalog.deleteRoleRef(id);
  }

  @Get('shared-references')
  @ApiOperation({ operationId: 'listSharedReferences' })
  @ApiCatalogList()
  @ApiQuery({ name: 'playbookId', required: false })
  @ApiOkResponse({ type: SharedReferenceConnectionResponse })
  listSharedReferences(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('playbookId') playbookId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listSharedReferences({
      ...catalogPage(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Get('shared-references/:id')
  @ApiOperation({ operationId: 'getSharedReference' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: SharedReferenceResponse })
  getSharedReference(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getSharedReference(id, catalogSelector(scope, revisionId));
  }

  @Post('shared-references')
  @ApiOperation({ operationId: 'createSharedReference' })
  @ApiCreatedResponse({ type: SharedReferenceResponse })
  createSharedReference(@Body() data: SharedReferenceRequest) {
    return this.catalog.createSharedReference({ ...data });
  }

  @Put('shared-references/:id')
  @ApiOperation({ operationId: 'updateSharedReference' })
  @ApiOkResponse({ type: SharedReferenceResponse })
  updateSharedReference(@Param('id') id: string, @Body() data: SharedReferenceUpdateRequest) {
    return this.catalog.updateSharedReference({ id, ...data });
  }

  @Delete('shared-references/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteSharedReference' })
  @ApiNoContentResponse()
  deleteSharedReference(@Param('id') id: string) {
    return this.catalog.deleteSharedReference(id);
  }

  @Get('stacks')
  @ApiOperation({ operationId: 'listStacks' })
  @ApiCatalogList()
  @ApiQuery({ name: 'playbookId', required: false })
  @ApiOkResponse({ type: StackConnectionResponse })
  listStacks(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('playbookId') playbookId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listStacks({
      ...catalogPage(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Get('stacks/:id')
  @ApiOperation({ operationId: 'getStack' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: StackResponse })
  getStack(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getStack(id, catalogSelector(scope, revisionId));
  }

  @Post('stacks')
  @ApiOperation({ operationId: 'createStack' })
  @ApiCreatedResponse({ type: StackResponse })
  createStack(@Body() data: StackRequest) {
    return this.catalog.createStack({ ...data });
  }

  @Put('stacks/:id')
  @ApiOperation({ operationId: 'updateStack' })
  @ApiOkResponse({ type: StackResponse })
  updateStack(@Param('id') id: string, @Body() data: StackUpdateRequest) {
    return this.catalog.updateStack({ id, ...data });
  }

  @Delete('stacks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteStack' })
  @ApiNoContentResponse()
  deleteStack(@Param('id') id: string) {
    return this.catalog.deleteStack(id);
  }

  @Get('stack-refs')
  @ApiOperation({ operationId: 'listStackRefs' })
  @ApiCatalogList()
  @ApiQuery({ name: 'stackId', required: false })
  @ApiOkResponse({ type: StackRefConnectionResponse })
  listStackRefs(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('stackId') stackId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listStackRefs({
      ...catalogPage(first, after, scope, revisionId),
      ...(stackId === undefined ? {} : { stackId }),
    });
  }

  @Get('stack-refs/:id')
  @ApiOperation({ operationId: 'getStackRef' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: StackRefResponse })
  getStackRef(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getStackRef(id, catalogSelector(scope, revisionId));
  }

  @Post('stack-refs')
  @ApiOperation({ operationId: 'createStackRef' })
  @ApiCreatedResponse({ type: StackRefResponse })
  createStackRef(@Body() data: StackRefRequest) {
    return this.catalog.createStackRef({ ...data });
  }

  @Put('stack-refs/:id')
  @ApiOperation({ operationId: 'updateStackRef' })
  @ApiOkResponse({ type: StackRefResponse })
  updateStackRef(@Param('id') id: string, @Body() data: StackRefUpdateRequest) {
    return this.catalog.updateStackRef({ id, ...data });
  }

  @Delete('stack-refs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteStackRef' })
  @ApiNoContentResponse()
  deleteStackRef(@Param('id') id: string) {
    return this.catalog.deleteStackRef(id);
  }

  @Get('method-documents')
  @ApiOperation({ operationId: 'listMethodDocuments' })
  @ApiCatalogList()
  @ApiQuery({ name: 'playbookId', required: false })
  @ApiOkResponse({ type: MethodDocumentConnectionResponse })
  listMethodDocuments(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('playbookId') playbookId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listMethodDocuments({
      ...catalogPage(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Get('method-documents/:id')
  @ApiOperation({ operationId: 'getMethodDocument' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: MethodDocumentResponse })
  getMethodDocument(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getMethodDocument(id, catalogSelector(scope, revisionId));
  }

  @Post('method-documents')
  @ApiOperation({ operationId: 'createMethodDocument' })
  @ApiCreatedResponse({ type: MethodDocumentResponse })
  createMethodDocument(@Body() data: MethodDocumentRequest) {
    return this.catalog.createMethodDocument({ ...data });
  }

  @Put('method-documents/:id')
  @ApiOperation({ operationId: 'updateMethodDocument' })
  @ApiOkResponse({ type: MethodDocumentResponse })
  updateMethodDocument(@Param('id') id: string, @Body() data: MethodDocumentUpdateRequest) {
    return this.catalog.updateMethodDocument({ id, ...data });
  }

  @Delete('method-documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteMethodDocument' })
  @ApiNoContentResponse()
  deleteMethodDocument(@Param('id') id: string) {
    return this.catalog.deleteMethodDocument(id);
  }

  @Get('pipelines')
  @ApiOperation({ operationId: 'listPipelines' })
  @ApiCatalogList()
  @ApiQuery({ name: 'playbookId', required: false })
  @ApiOkResponse({ type: PipelineConnectionResponse })
  listPipelines(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('playbookId') playbookId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listPipelines({
      ...catalogPage(first, after, scope, revisionId),
      ...(playbookId === undefined ? {} : { playbookId }),
    });
  }

  @Get('pipelines/:id')
  @ApiOperation({ operationId: 'getPipeline' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: PipelineResponse })
  getPipeline(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getPipeline(id, catalogSelector(scope, revisionId));
  }

  @Post('pipelines')
  @ApiOperation({ operationId: 'createPipeline' })
  @ApiCreatedResponse({ type: PipelineResponse })
  createPipeline(@Body() data: PipelineRequest) {
    return this.catalog.createPipeline({ ...data });
  }

  @Put('pipelines/:id')
  @ApiOperation({ operationId: 'updatePipeline' })
  @ApiOkResponse({ type: PipelineResponse })
  updatePipeline(@Param('id') id: string, @Body() data: PipelineUpdateRequest) {
    return this.catalog.updatePipeline({ id, ...data });
  }

  @Delete('pipelines/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deletePipeline' })
  @ApiNoContentResponse()
  deletePipeline(@Param('id') id: string) {
    return this.catalog.deletePipeline(id);
  }

  @Get('pipeline-roles')
  @ApiOperation({ operationId: 'listPipelineRoles' })
  @ApiCatalogList()
  @ApiQuery({ name: 'pipelineId', required: false })
  @ApiOkResponse({ type: PipelineRoleConnectionResponse })
  listPipelineRoles(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listPipelineRoles({
      ...catalogPage(first, after, scope, revisionId),
      ...(pipelineId === undefined ? {} : { pipelineId }),
    });
  }

  @Get('pipeline-roles/:id')
  @ApiOperation({ operationId: 'getPipelineRole' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: PipelineRoleResponse })
  getPipelineRole(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getPipelineRole(id, catalogSelector(scope, revisionId));
  }

  @Post('pipeline-roles')
  @ApiOperation({ operationId: 'createPipelineRole' })
  @ApiCreatedResponse({ type: PipelineRoleResponse })
  createPipelineRole(@Body() data: PipelineRoleRequest) {
    return this.catalog.createPipelineRole({ ...data });
  }

  @Delete('pipeline-roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deletePipelineRole' })
  @ApiNoContentResponse()
  deletePipelineRole(@Param('id') id: string) {
    return this.catalog.deletePipelineRole(id);
  }

  @Get('pipeline-sources')
  @ApiOperation({ operationId: 'listPipelineSources' })
  @ApiCatalogList()
  @ApiQuery({ name: 'pipelineId', required: false })
  @ApiOkResponse({ type: PipelineSourceConnectionResponse })
  listPipelineSources(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listPipelineSources({
      ...catalogPage(first, after, scope, revisionId),
      ...(pipelineId === undefined ? {} : { pipelineId }),
    });
  }

  @Get('pipeline-sources/:id')
  @ApiOperation({ operationId: 'getPipelineSource' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: PipelineSourceResponse })
  getPipelineSource(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getPipelineSource(id, catalogSelector(scope, revisionId));
  }

  @Put('pipeline-sources/:id')
  @ApiOperation({ operationId: 'updatePipelineSource' })
  @ApiOkResponse({ type: PipelineSourceResponse })
  updatePipelineSource(@Param('id') id: string, @Body() data: PipelineSourceUpdateRequest) {
    return this.catalog.updatePipelineSource({ id, ...data });
  }

  @Delete('pipeline-sources/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deletePipelineSource' })
  @ApiNoContentResponse()
  deletePipelineSource(@Param('id') id: string) {
    return this.catalog.deletePipelineSource(id);
  }

  @Get('pipeline-slots')
  @ApiOperation({ operationId: 'listPipelineSlots' })
  @ApiCatalogList()
  @ApiQuery({ name: 'pipelineId', required: false })
  @ApiOkResponse({ type: PipelineSlotConnectionResponse })
  listPipelineSlots(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listPipelineSlots({
      ...catalogPage(first, after, scope, revisionId),
      ...(pipelineId === undefined ? {} : { pipelineId }),
    });
  }

  @Get('pipeline-slots/:id')
  @ApiOperation({ operationId: 'getPipelineSlot' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: PipelineSlotResponse })
  getPipelineSlot(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getPipelineSlot(id, catalogSelector(scope, revisionId));
  }

  @Get('launch-profiles')
  @ApiOperation({ operationId: 'listLaunchProfiles' })
  @ApiCatalogList()
  @ApiQuery({ name: 'pipelineId', required: false })
  @ApiOkResponse({ type: LaunchProfileConnectionResponse })
  listLaunchProfiles(
    @Query('first') first?: string,
    @Query('after') after?: string,
    @Query('pipelineId') pipelineId?: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.listLaunchProfiles({
      ...catalogPage(first, after, scope, revisionId),
      ...(pipelineId === undefined ? {} : { pipelineId }),
    });
  }

  @Get('launch-profiles/:id')
  @ApiOperation({ operationId: 'getLaunchProfile' })
  @ApiCatalogScope()
  @ApiOkResponse({ type: LaunchProfileResponse })
  getLaunchProfile(
    @Param('id') id: string,
    @Query('scope') scope?: string,
    @Query('revisionId') revisionId?: string,
  ) {
    return this.catalog.getLaunchProfile(id, catalogSelector(scope, revisionId));
  }

  @Post('launch-profiles')
  @ApiOperation({ operationId: 'createLaunchProfile' })
  @ApiCreatedResponse({ type: LaunchProfileResponse })
  createLaunchProfile(@Body() data: LaunchProfileRequest) {
    return this.catalog.createLaunchProfile({ ...data });
  }

  @Put('launch-profiles/:id')
  @ApiOperation({ operationId: 'updateLaunchProfile' })
  @ApiOkResponse({ type: LaunchProfileResponse })
  updateLaunchProfile(@Param('id') id: string, @Body() data: LaunchProfileUpdateRequest) {
    return this.catalog.updateLaunchProfile({ id, ...data });
  }

  @Delete('launch-profiles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: 'deleteLaunchProfile' })
  @ApiNoContentResponse()
  deleteLaunchProfile(@Param('id') id: string) {
    return this.catalog.deleteLaunchProfile(id);
  }
}
