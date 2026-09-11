import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import type { AgentConfigurationSelection } from '@revisium/revo-agent-runtime';
import { GraphQLJSON } from 'graphql-scalars';

import type { DialogueJson } from '../../../../features/dialogues/management/contracts/dialogue.contracts.js';

@ObjectType()
export class DialogueSummaryModel {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  title: string;

  @Field(() => String)
  agentId: string;

  @Field(() => String)
  agentVersion: string;

  @Field(() => GraphQLJSON)
  agentConfiguration: AgentConfigurationSelection;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata: DialogueJson;

  @Field(() => String)
  systemContext: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  progress: string;

  @Field(() => Int)
  pendingCount: number;

  @Field(() => String, { nullable: true })
  lastOutcome: string | null;

  @Field(() => ID, { nullable: true })
  activeTurnId: string | null;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;

  @Field(() => String)
  version: string;

  @Field(() => String)
  significantSequence: string;

  @Field(() => String)
  readSignificantSequence: string;

  @Field(() => Int)
  unreadCount: number;

  @Field(() => ID, { nullable: true })
  runtimeSessionId: string | null;

  @Field(() => ID, { nullable: true })
  originDialogueId: string | null;

  @Field(() => ID, { nullable: true })
  originTurnId: string | null;

  @Field(() => String, { nullable: true })
  originItemSequence: string | null;

  @Field(() => String)
  contextMode: string;
}
