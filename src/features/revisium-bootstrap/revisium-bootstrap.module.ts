import { Module } from '@nestjs/common';
import { ShareModule } from '@revisium/engine';

import { ProjectModule } from '../project/project.module.js';
import { RevisiumBootstrapService } from './revisium-bootstrap.service.js';

@Module({
  imports: [ShareModule, ProjectModule],
  providers: [RevisiumBootstrapService],
})
export class RevisiumBootstrapModule {}
