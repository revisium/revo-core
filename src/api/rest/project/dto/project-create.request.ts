import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import { ProjectPublicMessage } from '../../../errors/project-public-messages.js';

export class ProjectCreateRequest {
  @ApiProperty()
  @IsString({ message: ProjectPublicMessage.nameRequired })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: ProjectPublicMessage.descriptionInvalid })
  description?: string;
}
