import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AgentLaunchEvidenceModel {
  @Field(() => String)
  executable: string;

  @Field(() => String)
  reportedVersion: string;
}
