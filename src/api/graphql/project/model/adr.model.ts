import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AdrAlternativeModel } from './adr-alternative.model.js';
import { AdrStatus } from './adr-status.enum.js';

@ObjectType('Adr')
export class AdrModel {
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

  @Field(() => [AdrAlternativeModel])
  alternatives: AdrAlternativeModel[];

  @Field()
  consequences: string;

  @Field(() => [String])
  relatedRequirements: string[];
}
