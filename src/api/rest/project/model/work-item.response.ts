import { ApiProperty } from '@nestjs/swagger';

export class WorkItemResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  cancelled: boolean;

  @ApiProperty()
  goal: string;

  @ApiProperty()
  inputs: string;

  @ApiProperty()
  owner: string;

  @ApiProperty()
  constraints: string;

  @ApiProperty()
  acceptance: string;

  @ApiProperty()
  plan: string;

  @ApiProperty({ type: [String] })
  dependsOn: string[];

  @ApiProperty({ type: [String] })
  relatedRequirements: string[];

  @ApiProperty({ type: [String] })
  relatedAdr: string[];
}
