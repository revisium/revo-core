import { ApiProperty } from '@nestjs/swagger';

export class ProjectCreatedResponse {
  @ApiProperty()
  projectId: string;
}
