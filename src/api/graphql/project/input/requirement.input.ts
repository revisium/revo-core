import { Field, ID, InputType } from '@nestjs/graphql';

import { RequirementStatus } from '../model/requirement-status.enum.js';

@InputType()
export class RequirementInput {
  @Field(() => ID)
  projectId: string;

  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field(() => RequirementStatus)
  status: RequirementStatus;

  @Field()
  statement: string;

  @Field()
  acceptance: string;

  @Field(() => [String])
  relatedAdr: string[];
}
