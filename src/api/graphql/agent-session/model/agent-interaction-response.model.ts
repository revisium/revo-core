import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@ObjectType()
export class AgentInteractionResponseModel {
  @Field(() => String)
  kind: string;

  @Field(() => String)
  outcome: string;

  @Field(() => String, { nullable: true })
  optionId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  values?: Readonly<Record<string, unknown>>;
}
