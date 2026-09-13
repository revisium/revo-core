import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class FileSystemEntryInput {
  @Field()
  path: string;
}
