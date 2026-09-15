import { ApiProperty } from '@nestjs/swagger';

export class ProjectNotActiveErrorResponse {
  @ApiProperty({ example: 'Project is not active.' })
  message: string;

  @ApiProperty({ example: 'Conflict' })
  error: string;

  @ApiProperty({ example: 409 })
  statusCode: number;
}
