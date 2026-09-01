import { ApiProperty } from '@nestjs/swagger';

import { PublicProjectStatus } from '../../../../features/project/contracts/project.enums.js';

export class ProjectResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: PublicProjectStatus, enumName: 'ProjectStatus' })
  status: PublicProjectStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: string;
}
