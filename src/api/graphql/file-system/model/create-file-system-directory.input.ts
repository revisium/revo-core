import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class CreateFileSystemDirectoryInput {
  @Field()
  parentPath: string;

  @Field()
  name: string;
}
