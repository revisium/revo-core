import { Field, ID, ObjectType } from '@nestjs/graphql';
import type { RunStatus, RunTerminal } from '@revisium/revo-run';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class RunModel {
  @Field()
  schemaVersion: 'run-snapshot/v1';

  @Field(() => ID)
  runId: string;

  @Field(() => String)
  status: RunStatus;

  @Field(() => GraphQLJSON, { nullable: true })
  terminal: RunTerminal | null;

  @Field(() => String)
  createdAt: string;

  @Field(() => String)
  updatedAt: string;
}
