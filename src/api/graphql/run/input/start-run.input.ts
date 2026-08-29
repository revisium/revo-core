import { Field, InputType } from '@nestjs/graphql';
import type { JsonValue, PipelineSourcePackage, RunProfile } from '@revisium/revo-run';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class StartRunInput {
  @Field(() => String, { nullable: true })
  pipelineId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  pipeline?: PipelineSourcePackage;

  @Field(() => String, { nullable: true })
  profileId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  profile?: RunProfile;

  @Field(() => GraphQLJSON)
  input: JsonValue;
}
