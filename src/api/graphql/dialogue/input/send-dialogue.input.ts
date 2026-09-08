import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class SendDialogueInput {
  @Field(() => ID)
  dialogueId: string;

  @Field(() => String)
  commandId: string;

  @Field(() => String)
  prompt: string;
}
