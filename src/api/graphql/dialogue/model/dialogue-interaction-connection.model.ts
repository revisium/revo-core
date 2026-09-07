import { Field, ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { DialogueInteractionModel } from './dialogue-interaction.model.js';

@ObjectType()
export class DialogueInteractionConnectionModel extends Paginated(DialogueInteractionModel) {
  @Field()
  snapshotCursor: string;
}
