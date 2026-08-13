import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PageInfoResponse {
  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPreviousPage: boolean;

  @ApiPropertyOptional()
  startCursor?: string;

  @ApiPropertyOptional()
  endCursor?: string;
}
