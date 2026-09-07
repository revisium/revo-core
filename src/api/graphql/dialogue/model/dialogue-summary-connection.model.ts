import { Field, ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { DialogueSummaryModel } from './dialogue-summary.model.js';

@ObjectType()
export class DialogueSummaryConnectionModel extends Paginated(DialogueSummaryModel) {
  @Field()
  snapshotCursor: string;
}
