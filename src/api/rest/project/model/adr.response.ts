import { ApiProperty } from '@nestjs/swagger';

import { AdrAlternativeResponse } from './adr-alternative.response.js';

export class AdrResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: ['proposed', 'accepted', 'deprecated', 'superseded', 'rejected'] })
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded' | 'rejected';

  @ApiProperty()
  supersededBy: string;

  @ApiProperty()
  context: string;

  @ApiProperty()
  decision: string;

  @ApiProperty({ type: [AdrAlternativeResponse] })
  alternatives: AdrAlternativeResponse[];

  @ApiProperty()
  consequences: string;

  @ApiProperty({ type: [String] })
  relatedRequirements: string[];
}
