import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { JsonValue } from '@revisium/revo-pipeline';
import type { ExecutionPlan, RunStatus } from '@revisium/revo-run';
import { GraphQLJSON } from 'graphql-scalars';

import { RunErrorModel } from './run-error.model.js';

@ObjectType()
export class RunModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  status: RunStatus;

  @Field(() => GraphQLJSON)
  executionPlan: ExecutionPlan;

  @Field(() => GraphQLJSON)
  input: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  result?: JsonValue;

  @Field(() => RunErrorModel, { nullable: true })
  error?: RunErrorModel;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
