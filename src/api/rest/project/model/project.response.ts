import { ApiProperty } from '@nestjs/swagger';

export class ProjectResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}
