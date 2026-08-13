import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsString } from 'class-validator';

import { ProjectError } from '../../../../features/project/project-errors.js';
import type { RequirementStatus } from '../../../../features/project/requirement.js';

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

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  relatedAdr: string[];
}
