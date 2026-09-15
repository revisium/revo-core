import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsString } from 'class-validator';

import { ProjectPublicMessage } from '../../../errors/public-error-definitions.js';

export class RequirementRequest {
  @ApiProperty()
  @IsString({ message: ProjectPublicMessage.recordIdRequired })
  id: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: ['proposed', 'accepted', 'deferred', 'rejected'] })
  @IsIn(['proposed', 'accepted', 'deferred', 'rejected'])
  status: 'proposed' | 'accepted' | 'deferred' | 'rejected';

  @ApiProperty()
  @IsString()
  statement: string;

  @ApiProperty()
  @IsString()
  acceptance: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  relatedAdr: string[];
}
