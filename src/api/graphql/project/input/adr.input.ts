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

  @Field()
  supersededBy: string;

  @Field()
  context: string;

  @Field()
  decision: string;

  @Field(() => [AdrAlternativeInput])
  alternatives: AdrAlternativeInput[];

  @Field()
  consequences: string;

  @Field(() => [String])
  relatedRequirements: string[];
}
