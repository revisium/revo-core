import { Field, ID, InputType } from '@nestjs/graphql';
import type { JsonValue, PipelineSourcePackage, RunProfile } from '@revisium/revo-run';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class StartRunInput {
  @Field(() => ID, { nullable: true })
  pipelineId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  pipeline?: PipelineSourcePackage;

  @Field(() => ID, { nullable: true })
  profileId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  profile?: RunProfile;

  @Field(() => GraphQLJSON)
  input: JsonValue;
}
