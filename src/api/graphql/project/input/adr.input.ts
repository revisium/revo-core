import { Field, ID, InputType } from '@nestjs/graphql';

import { AdrStatus } from '../model/adr-status.enum.js';
import { AdrAlternativeInput } from './adr-alternative.input.js';

@InputType()
export class AdrInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => AdrStatus)
  status: AdrStatus;

  @Field(() => String, { nullable: true })
  supersededBy?: string;

  @Field()
  context: string;

  @Field()
  decision: string;

  @Field(() => [AdrAlternativeInput], { nullable: true })
  alternatives?: AdrAlternativeInput[];

  @Field(() => String, { nullable: true })
  consequences?: string;

  @Field(() => [String], { nullable: true })
  relatedRequirements?: string[];
}
