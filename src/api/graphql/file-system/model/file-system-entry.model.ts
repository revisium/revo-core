import { Field, ObjectType, registerEnumType } from '@nestjs/graphql';

import { FileSystemEntryType } from '../../../../features/file-system/contracts/file-system.contracts.js';

registerEnumType(FileSystemEntryType, { name: 'FileSystemEntryType' });

@ObjectType()
export class FileSystemEntryModel {
  @Field(() => String)
  name: string;

  @Field(() => String)
  path: string;

  @Field(() => FileSystemEntryType)
  type: FileSystemEntryType;

  @Field(() => Boolean)
  isSymlink: boolean;
}
