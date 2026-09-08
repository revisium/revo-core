import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import type { DialogueJson } from '../../../../features/dialogues/management/contracts/dialogue.contracts.js';

@ObjectType()
export class DialogueTurnModel {
  @Field(() => Boolean)
  cancelRequested: boolean;

  @Field(() => ID)
  id: string;

  @Field(() => ID)
  dialogueId: string;

  @Field(() => String)
  commandId: string;

  @Field(() => ID)
  userItemId: string;

  @Field(() => String)
  status: string;

  @Field(() => String)
  dispatchState: string;

  @Field(() => ID, { nullable: true })
  runtimeSessionId: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  outcome: DialogueJson;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime, { nullable: true })
  completedAt: Date | null;

  @Field(() => String, { nullable: true })
  endItemSequence: string | null;
}
