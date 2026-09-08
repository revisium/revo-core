import { Field, ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { DialogueHistoryItemModel } from './dialogue-history-item.model.js';

@ObjectType()
export class DialogueHistoryItemConnectionModel extends Paginated(DialogueHistoryItemModel) {
  @Field(() => String, { nullable: true })
  observedSignificantSequence?: string;

  @Field()
  snapshotCursor: string;
}
