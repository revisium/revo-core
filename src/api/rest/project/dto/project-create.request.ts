import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { ProjectError } from '../../../../features/project/project-errors.js';

export class ProjectCreateRequest {
  @ApiProperty()
  @IsString({ message: ProjectError.nameRequired })
  name: string;
}
