import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class AdrAlternativeResponse {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  summary: string;
}
