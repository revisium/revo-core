import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentSessionPinModel {
  @Field(() => String)
  agentId: string;

  @Field(() => String)
  agentVersion: string;

  @Field(() => String)
  definitionDigest: string;
}
