import { Field, ID, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import type { DialogueJson } from '../../../../features/dialogues/management/contracts/dialogue.contracts.js';

@InputType()
export class RespondDialogueInput {
  @Field(() => ID)
  dialogueId: string;

  @Field(() => ID)
  interactionId: string;

  @Field(() => String)
  commandId: string;

  @Field(() => GraphQLJSON)
  response: DialogueJson;
}
