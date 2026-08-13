import { ApiProperty } from '@nestjs/swagger';

export class RequirementResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ['proposed', 'accepted', 'deferred', 'rejected'] })
  status: 'proposed' | 'accepted' | 'deferred' | 'rejected';

  @ApiProperty()
  statement: string;

  @ApiProperty()
  acceptance: string;

  @ApiProperty({ type: [String] })
  relatedAdr: string[];
}
