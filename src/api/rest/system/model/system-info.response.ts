import { ApiProperty } from '@nestjs/swagger';

export class SystemInfoResponse {
  @ApiProperty({ example: 'revo-core' })
  name: string;

  @ApiProperty({ example: 'ok' })
  status: string;
}
