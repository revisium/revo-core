import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { ProjectError } from '../../../../features/project/project-errors.js';
import type { WorkPlanStatus } from '../../../../features/project/project-records.js';

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  baselineId?: string;

  @ApiProperty()
  @IsString()
  acceptance: string;
}
