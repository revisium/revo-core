import { Field, InputType } from '@nestjs/graphql';

import { FileSystemPageInput } from './file-system-page.input.js';

@InputType()
export class FileSystemDirectoryInput extends FileSystemPageInput {
  @Field()
  path: string;

  @Field({ nullable: true })
  directoriesOnly?: boolean;

  @Field({ nullable: true })
  includeHidden?: boolean;
}
