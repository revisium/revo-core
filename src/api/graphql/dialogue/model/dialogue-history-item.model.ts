import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import type { DialogueJson } from '../../../../features/dialogue/contracts/dialogue.contracts.js';

@ObjectType()
export class DialogueHistoryItemModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  dialogueId: string;

  @Field(() => String)
  sequence: string;

  @Field(() => ID, { nullable: true })
  turnId: string | null;

  @Field(() => String)
  kind: string;

  @Field(() => String)
  source: string;
  @Field(() => String)
  text: string;

  @Field(() => GraphQLJSON, { nullable: true })
  payload: DialogueJson;

  @Field(() => String)
  status: string;

  @Field(() => String)
  version: string;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => Boolean)
  historical: boolean;
}
