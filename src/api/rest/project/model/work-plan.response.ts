import { ApiProperty } from '@nestjs/swagger';

export class WorkPlanResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ['draft', 'ready', 'closed'] })
  status: 'draft' | 'ready' | 'closed';

  @ApiProperty()
  outcome: string;

  @ApiProperty()
  bounds: string;

  @ApiProperty()
  baselineId: string;

  @ApiProperty()
  acceptance: string;
}
