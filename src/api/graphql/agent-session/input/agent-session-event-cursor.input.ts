import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

@InputType()
export class AgentSessionEventCursorInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  streamId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  sequence: number;

  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  eventId: string;
}
