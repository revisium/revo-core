import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';

import { PlaybookCatalogApiService } from '../../../features/playbook-catalog/playbook-catalog-api.service.js';
import { catalogPage } from './catalog-request.js';
import { CatalogImportRequest, CommitCatalogRequest } from './dto/catalog-records.request.js';
import {
  CatalogChangeConnectionResponse,
  CatalogCommitResultResponse,
  CatalogImportResultResponse,
  CatalogMutationResultResponse,
  CatalogSnapshotResponse,
  CatalogStatusResponse,
} from './model/catalog-records.response.js';

@ApiTags('Playbook Catalog')
@Controller('playbook-catalog')
@UsePipes(new ValidationPipe())
export class CatalogController {
  constructor(private readonly catalog: PlaybookCatalogApiService) {}

  @Get('status')
  @ApiOperation({ operationId: 'getCatalogStatus' })
  @ApiOkResponse({ type: CatalogStatusResponse })
  status() {
    return this.catalog.status();
  }

  @Get('changes')
  @ApiOperation({ operationId: 'listCatalogChanges' })
  @ApiQuery({ name: 'first', type: Number, required: false, default: 100, maximum: 1000 })
  @ApiQuery({ name: 'after', type: String, required: false })
  @ApiOkResponse({ type: CatalogChangeConnectionResponse })
  changes(@Query('first') first?: string, @Query('after') after?: string) {
    const page = catalogPage(first, after, undefined, undefined);
    return this.catalog.changes(
      page.after === undefined ? { first: page.first } : { first: page.first, after: page.after },
    );
  }

  @Get('snapshot')
  @ApiOperation({ operationId: 'getCatalogSnapshot' })
  @ApiQuery({ name: 'revisionId', required: true })
  @ApiOkResponse({ type: CatalogSnapshotResponse })
  snapshot(@Query('revisionId') revisionId?: string) {
    if (revisionId === undefined || revisionId === '') {
      throw new NotFoundException('Record unavailable');
    }
    return this.catalog.snapshot(revisionId);
  }

  @Post('commit')
  @ApiOperation({ operationId: 'commitCatalog' })
  @ApiCreatedResponse({ type: CatalogCommitResultResponse })
  commit(@Body() data: CommitCatalogRequest) {
    return this.catalog.commitCatalog(data.message);
  }

  @Post('discard')
  @ApiOperation({ operationId: 'discardCatalog' })
  @ApiCreatedResponse({ type: CatalogMutationResultResponse })
  discard() {
    return this.catalog.discardCatalog();
  }

  @Post('import')
  @ApiOperation({ operationId: 'importCatalog' })
  @ApiCreatedResponse({ type: CatalogImportResultResponse })
  importCatalog(@Body() data: CatalogImportRequest) {
    return this.catalog.importCatalog(data);
  }
}
