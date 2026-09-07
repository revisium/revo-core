import { Field, ID, ObjectType } from '@nestjs/graphql';

import { DialogueHistoryItemModel } from './dialogue-history-item.model.js';
import { DialogueSummaryModel } from './dialogue-summary.model.js';

@ObjectType()
export class DialogueChangeModel {
  @Field(() => String)
  cursor: string;

  @Field(() => ID)
  dialogueId: string;

  @Field(() => String)
  kind: string;

  @Field(() => ID, { nullable: true })
  itemId: string | null;

  @Field(() => String, { nullable: true })
  itemVersion: string | null;

  @Field(() => String, { nullable: true })
  baseItemVersion: string | null;

  @Field(() => String, { nullable: true })
  itemSequence: string | null;

  @Field(() => ID, { nullable: true })
  turnId: string | null;

  @Field(() => String, { nullable: true })
  itemKind: string | null;

  @Field(() => String, { nullable: true })
  itemSource: string | null;

  @Field(() => String, { nullable: true })
  textDelta: string | null;

  @Field(() => DialogueHistoryItemModel, { nullable: true })
  item: DialogueHistoryItemModel | null;

  @Field(() => DialogueSummaryModel, { nullable: true })
  summary: DialogueSummaryModel | null;
}
