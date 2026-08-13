import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsString } from 'class-validator';

import { ProjectError } from '../../../../features/project/constants/project.constants.js';

export class WorkItemRequest {
  @ApiProperty()
  @IsString({ message: ProjectError.recordIdRequired })
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsBoolean()
  cancelled: boolean;

  @ApiProperty()
  @IsString()
  goal: string;

  @ApiProperty()
  @IsString()
  inputs: string;

  @ApiProperty()
  @IsString()
  owner: string;

  @ApiProperty()
  @IsString()
  constraints: string;

  @ApiProperty()
  @IsString()
  acceptance: string;

  @ApiProperty()
  @IsString()
  plan: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  dependsOn: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  relatedRequirements: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  relatedAdr: string[];
}
