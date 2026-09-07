import { Field, ID, InputType } from '@nestjs/graphql';

@InputType()
export class ForkDialogueInput {
  @Field(() => ID)
  dialogueId: string;

  @Field(() => ID)
  turnId: string;

  @Field(() => String)
  title: string;
}
