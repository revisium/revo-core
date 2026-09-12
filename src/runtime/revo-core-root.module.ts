import { type DynamicModule, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CoreModule } from '../core.module.js';
import type { RevoCoreApplicationConfiguration } from './runtime-configuration.js';

@Module({})
export class RevoCoreRootModule {
  static configure(configuration: RevoCoreApplicationConfiguration): DynamicModule {
    return {
      module: RevoCoreRootModule,
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          isGlobal: true,
          load: [() => configuration],
        }),
        CoreModule,
      ],
    };
  }
}
