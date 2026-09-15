import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

import { ProjectPublicMessage } from '../../../errors/public-error-definitions.js';

export class WorkPlanRequest {
  @ApiProperty()
  @IsString({ message: ProjectPublicMessage.recordIdRequired })
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: ['draft', 'ready', 'closed'] })
  @IsIn(['draft', 'ready', 'closed'])
  status: 'draft' | 'ready' | 'closed';

  @ApiProperty()
  @IsString()
  outcome: string;

  @ApiProperty()
  @IsString()
  bounds: string;

  @ApiProperty()
  @IsString()
  baselineId: string;

  @ApiProperty()
  @IsString()
  acceptance: string;
}
