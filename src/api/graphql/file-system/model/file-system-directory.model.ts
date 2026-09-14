import { Field, ObjectType } from '@nestjs/graphql';

import { FileSystemEntryConnectionModel } from './file-system-entry-connection.model.js';

@ObjectType()
export class FileSystemDirectoryModel {
  @Field(() => String)
  path: string;

  @Field(() => String, { nullable: true })
  parentPath: string | null;

  @Field(() => FileSystemEntryConnectionModel)
  entries: FileSystemEntryConnectionModel;
}
