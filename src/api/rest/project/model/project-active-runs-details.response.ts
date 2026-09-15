import { ApiProperty } from '@nestjs/swagger';

export class ProjectActiveRunsDetailsResponse {
  @ApiProperty({ type: [String], example: ['r_example'] })
  runIds: string[];
}
