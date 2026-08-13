import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

import { ProjectError } from '../../../../features/project/project-errors.js';
import type { AdrStatus } from '../../../../features/project/project-records.js';
import { AdrAlternativeResponse } from '../model/adr-alternative.response.js';

export class AdrRequest {
  @ApiProperty()
  @IsString({ message: ProjectError.recordIdRequired })
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: ['proposed', 'accepted', 'deprecated', 'superseded', 'rejected'] })
  @IsIn(['proposed', 'accepted', 'deprecated', 'superseded', 'rejected'])
  status: AdrStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supersededBy?: string;

  @ApiProperty()
  @IsString()
  context: string;

  @ApiProperty()
  @IsString()
  decision: string;

  @ApiPropertyOptional({ type: [AdrAlternativeResponse] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdrAlternativeResponse)
  alternatives?: AdrAlternativeResponse[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consequences?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  relatedRequirements?: string[];
}
