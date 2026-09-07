import { Field, ID, ObjectType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import type { DialogueJson } from '../../../../features/dialogue/contracts/dialogue.contracts.js';

@ObjectType()
export class DialogueInteractionModel {
  @Field(() => ID)
  id: string;

  @Field(() => ID)
  dialogueId: string;

  @Field(() => ID, { nullable: true })
  turnId: string | null;

  @Field(() => String)
  status: string;

  @Field(() => GraphQLJSON)
  request: DialogueJson;

  @Field(() => GraphQLJSON, { nullable: true })
  response: DialogueJson | null;

  @Field(() => String, { nullable: true })
  responseCommandId: string | null;
}
