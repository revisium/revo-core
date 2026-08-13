import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

import { ProjectError } from '../../../../features/project/project-errors.js';
import type { WorkPlanStatus } from '../../../../features/project/work-plan.js';

export class WorkPlanRequest {
  @ApiProperty()
  @IsString({ message: ProjectError.recordIdRequired })
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: ['draft', 'ready', 'closed'] })
  @IsIn(['draft', 'ready', 'closed'])
  status: WorkPlanStatus;

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
