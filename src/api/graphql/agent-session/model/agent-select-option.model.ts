import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentSelectOptionModel {
  @Field(() => String)
  optionId: string;

  @Field(() => String)
  label: string;
}
