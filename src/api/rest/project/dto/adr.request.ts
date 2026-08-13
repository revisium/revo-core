import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';

import { ProjectError } from '../../../../features/project/constants/project.constants.js';
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
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded' | 'rejected';

  @ApiProperty()
  @IsString()
  supersededBy: string;

  @ApiProperty()
  @IsString()
  context: string;

  @ApiProperty()
  @IsString()
  decision: string;

  @ApiProperty({ type: [AdrAlternativeResponse] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdrAlternativeResponse)
  alternatives: AdrAlternativeResponse[];

  @ApiProperty()
  @IsString()
  consequences: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  relatedRequirements: string[];
}
