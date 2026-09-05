import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class AgentFaultModel {
  @Field(() => String)
  code: string;

  @Field(() => String)
  message: string;

  @Field(() => String)
  phase: string;

  @Field(() => Boolean)
  retryable: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  details?: Readonly<Record<string, unknown>>;
}
