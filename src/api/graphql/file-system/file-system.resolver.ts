import { UseFilters } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import type { FileSystemClient } from '../../../features/file-system/contracts/file-system-client.js';
import { FileSystemApiService } from '../../../features/file-system/file-system-api.service.js';
import { FileSystemBrowserAccessService } from '../../file-system/file-system-browser-access.service.js';
import { FileSystemGraphqlExceptionFilter } from './file-system-graphql-exception.filter.js';
import { CreateFileSystemDirectoryInput } from './model/create-file-system-directory.input.js';
import { FileSystemDirectoryInput } from './model/file-system-directory.input.js';
import { FileSystemDirectoryModel } from './model/file-system-directory.model.js';
import { FileSystemEntryInput } from './model/file-system-entry.input.js';
import { FileSystemEntryModel } from './model/file-system-entry.model.js';
import { FileSystemPageInput } from './model/file-system-page.input.js';
import { FileSystemRootConnectionModel } from './model/file-system-root-connection.model.js';

@Resolver()
@UseFilters(FileSystemGraphqlExceptionFilter)
export class FileSystemResolver {
  private readonly filesystem: FileSystemClient;

  constructor(filesystem: FileSystemApiService, access: FileSystemBrowserAccessService) {
    this.filesystem = filesystem.withAccess(() => access.getContext());
  }

  @Query(() => FileSystemRootConnectionModel)
  fileSystemRoots(@Args('data', { nullable: true }) data?: FileSystemPageInput) {
    return this.filesystem.getRoots(data ?? {});
  }

  @Query(() => FileSystemEntryModel)
  fileSystemEntry(@Args('data') data: FileSystemEntryInput) {
    return this.filesystem.getEntry(data);
  }

  @Query(() => FileSystemDirectoryModel)
  fileSystemDirectory(@Args('data') data: FileSystemDirectoryInput) {
    return this.filesystem.getDirectory(data);
  }

  @Mutation(() => FileSystemEntryModel)
  createFileSystemDirectory(@Args('data') data: CreateFileSystemDirectoryInput) {
    return this.filesystem.createDirectory(data);
  }
}
