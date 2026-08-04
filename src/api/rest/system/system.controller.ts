import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SystemApiService } from '../../../features/system/system-api.service.js';
import { SystemInfoResponse } from './model/system-info.response.js';

@ApiTags('System')
@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemApiService) {}

  @Get()
  @ApiOperation({ operationId: 'getSystemInfo', summary: 'Get system information' })
  @ApiOkResponse({ type: SystemInfoResponse })
  getInfo(): Promise<SystemInfoResponse> {
    return this.system.getInfo();
  }
}
