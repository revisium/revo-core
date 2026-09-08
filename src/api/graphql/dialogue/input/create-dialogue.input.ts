import { Field, InputType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

import type { DialogueJson } from '../../../../features/dialogues/management/contracts/dialogue.contracts.js';

@InputType()
export class CreateDialogueInput {
  @Field(() => String)
  title: string;

  @Field(() => String)
  agentId: string;

  @Field(() => String)
  agentVersion: string;

  @Field(() => GraphQLJSON, { nullable: true })
  agentConfiguration?: DialogueJson | null;

  @Field(() => String, { nullable: true })
  systemContext?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: DialogueJson | null;
}
