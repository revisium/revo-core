import { Module } from '@nestjs/common';

import { RunModule } from '../../features/run/run.module.js';
import { SystemModule } from '../../features/system/system.module.js';
import { RunController } from './run/run.controller.js';
import { SystemController } from './system/system.controller.js';

@Module({
  imports: [RunModule, SystemModule],
  controllers: [RunController, SystemController],
})
export class RestApiModule {}
