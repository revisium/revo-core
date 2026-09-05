import { Field, ID, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsString } from 'class-validator';
import { GraphQLJSON } from 'graphql-scalars';

@InputType()
export class RespondAgentSessionInput {
  @Field(() => ID)
  @IsString()
  @IsNotEmpty()
  requestId: string;

  @Field()
  kind: string;
  @Field()
  outcome: string;
  @Field({ nullable: true })
  optionId?: string;
  @Field(() => GraphQLJSON, { nullable: true })
  values?: Readonly<Record<string, unknown>>;
}
