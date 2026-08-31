import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

import { ProjectError } from '../../../../features/project/contracts/project.errors.js';

export class ProjectCreateRequest {
  @ApiProperty()
  @IsString({ message: ProjectError.nameRequired })
  name: string;
}
