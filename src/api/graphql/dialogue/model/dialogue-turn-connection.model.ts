import { Field, ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { DialogueTurnModel } from './dialogue-turn.model.js';

@ObjectType()
export class DialogueTurnConnectionModel extends Paginated(DialogueTurnModel) {
  @Field()
  snapshotCursor: string;
}
