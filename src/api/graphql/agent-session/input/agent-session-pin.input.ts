import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AgentSessionPinInput {
  @Field()
  agentId: string;
  @Field()
  agentVersion: string;
  @Field()
  definitionDigest: string;
}
