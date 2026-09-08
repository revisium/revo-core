import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentConfigurationBooleanModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => String, { nullable: true })
  category?: string;

  @Field(() => String)
  type: string;

  @Field(() => Boolean)
  currentValue: boolean;
}
