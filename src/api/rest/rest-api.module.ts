import { Module } from '@nestjs/common';

import { SystemModule } from '../../features/system/system.module.js';
import { SystemController } from './system/system.controller.js';

@Module({
  imports: [SystemModule],
  controllers: [SystemController],
})
export class RestApiModule {}
