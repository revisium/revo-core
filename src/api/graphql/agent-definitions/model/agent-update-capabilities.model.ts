import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentUpdateCapabilitiesModel {
  @Field(() => Boolean)
  message: boolean;

  @Field(() => Boolean)
  progress: boolean;

  @Field(() => Boolean)
  tool: boolean;

  @Field(() => Boolean)
  plan: boolean;

  @Field(() => Boolean)
  usage: boolean;
}
