import { ApiProperty } from '@nestjs/swagger';

export class SystemInfoResponse {
  @ApiProperty({ example: 'revo-core' })
  declare name: string;

  @ApiProperty({ example: 'ok' })
  declare status: string;
}
