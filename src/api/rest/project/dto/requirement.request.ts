import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

import { ProjectError } from '../../../../features/project/project-errors.js';
import type { RequirementStatus } from '../../../../features/project/project-records.js';

export class RequirementRequest {
  @ApiProperty()
  @IsString({ message: ProjectError.recordIdRequired })
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: ['proposed', 'accepted', 'deferred', 'rejected'] })
  @IsIn(['proposed', 'accepted', 'deferred', 'rejected'])
  status: RequirementStatus;

  @ApiProperty()
  @IsString()
  statement: string;

  @ApiProperty()
  @IsString()
  acceptance: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedAdr?: string[];
}
