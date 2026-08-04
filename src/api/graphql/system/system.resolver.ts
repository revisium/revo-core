import { Query, Resolver } from '@nestjs/graphql';

import { SystemApiService } from '../../../features/system/system-api.service.js';
import { SystemInfoModel } from './model/system-info.model.js';

@Resolver(() => SystemInfoModel)
export class SystemResolver {
  constructor(private readonly system: SystemApiService) {}

  @Query(() => SystemInfoModel)
  systemInfo(): Promise<SystemInfoModel> {
    return this.system.getInfo();
  }
}
