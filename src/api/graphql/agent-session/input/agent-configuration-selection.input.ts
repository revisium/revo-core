import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class AgentConfigurationSelectionInput {
  @Field({ nullable: true })
  catalogRevision?: string;

  @Field(() => GraphQLJSON)
  selections: Readonly<Record<string, boolean | string>>;
}
