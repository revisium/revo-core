import { Module } from '@nestjs/common';
import { ShareModule } from '@revisium/engine';

import { PlaybookCatalogModule } from '../playbook-catalog/playbook-catalog.module.js';
import { ProjectModule } from '../project/project.module.js';
import { RevisiumBootstrapService } from './revisium-bootstrap.service.js';

@Module({
  imports: [ShareModule, ProjectModule, PlaybookCatalogModule],
  providers: [RevisiumBootstrapService],
})
export class RevisiumBootstrapModule {}
