import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import { AgentPendingInteractionModel } from './agent-pending-interaction.model.js';
import { AgentSessionCapabilitiesModel } from './agent-session-capabilities.model.js';
import { AgentSessionEventCursorModel } from './agent-session-event-cursor.model.js';
import { AgentSessionPinModel } from './agent-session-pin.model.js';

@ObjectType()
export class AgentSessionSnapshotModel {
  @Field(() => ID)
  sessionId: string;
  @Field(() => AgentSessionPinModel)
  pin: AgentSessionPinModel;
  @Field(() => AgentSessionCapabilitiesModel, { nullable: true })
  capabilities?: AgentSessionCapabilitiesModel;
  @Field()
  status: string;
  @Field(() => ID, { nullable: true })
  activeTurnId?: string;
  @Field(() => [AgentPendingInteractionModel])
  pendingInteractions: readonly AgentPendingInteractionModel[];
  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Readonly<Record<string, unknown>>;
  @Field()
  acceptedAt: string;
  @Field({ nullable: true })
  openedAt?: string;
  @Field(() => AgentSessionEventCursorModel, { nullable: true })
  cursor?: AgentSessionEventCursorModel;
}
