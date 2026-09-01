import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, ValidateIf } from 'class-validator';

import { ProjectError } from '../../../../features/project/contracts/project.errors.js';

export class ProjectUpdateRequest {
  @ApiPropertyOptional()
  @ValidateIf((request: ProjectUpdateRequest) => request.name !== undefined)
  @IsString({ message: ProjectError.nameRequired })
  name?: string;

  @ApiPropertyOptional()
  @ValidateIf((request: ProjectUpdateRequest) => request.description !== undefined)
  @IsString({ message: ProjectError.descriptionInvalid })
  description?: string;
}
