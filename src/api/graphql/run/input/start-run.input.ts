import { Field, InputType } from '@nestjs/graphql';
import type { JsonValue, PipelineDefinition } from '@revisium/revo-pipeline';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class StartRunInput {
  @Field(() => GraphQLJSON)
  pipeline: PipelineDefinition;

  @Field(() => GraphQLJSON)
  input: JsonValue;
}
