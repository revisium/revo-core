import { ApiProperty } from '@nestjs/swagger';

export class StartRunResponse {
  @ApiProperty()
  runId: string;
}
