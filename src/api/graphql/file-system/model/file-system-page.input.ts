import { Field, InputType, Int } from '@nestjs/graphql';

@InputType()
export class FileSystemPageInput {
  @Field(() => Int, { nullable: true })
  first?: number;

  @Field({ nullable: true })
  after?: string;
}
