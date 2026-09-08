import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentConfigurationGroupModel {
  @Field(() => String)
  id: string;

  @Field(() => String)
  name: string;
}
