import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, ValidateIf } from 'class-validator';

import { ProjectPublicMessage } from '../../../errors/project-public-messages.js';

export class ProjectUpdateRequest {
  @ApiPropertyOptional()
  @ValidateIf((request: ProjectUpdateRequest) => request.name !== undefined)
  @IsString({ message: ProjectPublicMessage.nameRequired })
  name?: string;

  @ApiPropertyOptional()
  @ValidateIf((request: ProjectUpdateRequest) => request.description !== undefined)
  @IsString({ message: ProjectPublicMessage.descriptionInvalid })
  description?: string;
}
