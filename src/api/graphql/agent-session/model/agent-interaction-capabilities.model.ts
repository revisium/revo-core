import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentInteractionCapabilitiesModel {
  @Field(() => Boolean)
  permission: boolean;

  @Field(() => Boolean)
  input: boolean;
}
