import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { ProjectError } from '../../../../features/project/contracts/project.errors.js';

export class ProjectCreateRequest {
  @ApiProperty()
  @IsString({ message: ProjectError.nameRequired })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: ProjectError.descriptionInvalid })
  description?: string;
}
