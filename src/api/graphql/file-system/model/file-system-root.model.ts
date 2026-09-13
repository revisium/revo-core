import { Field, ObjectType } from '@nestjs/graphql';
import { registerEnumType } from '@nestjs/graphql';

import { FileSystemRootType } from '../../../../features/file-system/contracts/file-system.contracts.js';

registerEnumType(FileSystemRootType, { name: 'FileSystemRootType' });

@ObjectType()
export class FileSystemRootModel {
  @Field(() => String)
  name: string;

  @Field(() => String)
  path: string;

  @Field(() => FileSystemRootType)
  type: FileSystemRootType;
}
