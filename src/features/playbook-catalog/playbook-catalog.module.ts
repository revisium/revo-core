import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ShareModule } from '@revisium/engine';

import { PLAYBOOK_CATALOG_COMMAND_HANDLERS } from './commands/index.js';
import { CatalogRevisionService } from './engine/catalog-revision.service.js';
import { PlaybookCatalogApiService } from './playbook-catalog-api.service.js';
import { PLAYBOOK_CATALOG_QUERY_HANDLERS } from './queries/index.js';

@Module({
  imports: [CqrsModule, ShareModule],
  providers: [
    CatalogRevisionService,
    PlaybookCatalogApiService,
    ...PLAYBOOK_CATALOG_COMMAND_HANDLERS,
    ...PLAYBOOK_CATALOG_QUERY_HANDLERS,
  ],
  exports: [PlaybookCatalogApiService],
})
export class PlaybookCatalogModule {}
