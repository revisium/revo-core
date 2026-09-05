import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class TurnStartedEventModel extends AgentSessionEventModel {
  @Field(() => ID)
  turnId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Readonly<Record<string, unknown>>;
}
