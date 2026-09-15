import { UseFilters } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

import { FileSystemApiService } from '../../../features/file-system/file-system-api.service.js';
import { ApplicationGraphqlExceptionFilter } from '../application-graphql-exception.filter.js';
import { CreateFileSystemDirectoryInput } from './model/create-file-system-directory.input.js';
import { FileSystemDirectoryInput } from './model/file-system-directory.input.js';
import { FileSystemDirectoryModel } from './model/file-system-directory.model.js';
import { FileSystemEntryInput } from './model/file-system-entry.input.js';
import { FileSystemEntryModel } from './model/file-system-entry.model.js';
import { FileSystemPageInput } from './model/file-system-page.input.js';
import { FileSystemRootConnectionModel } from './model/file-system-root-connection.model.js';

@Resolver()
@UseFilters(ApplicationGraphqlExceptionFilter)
export class FileSystemResolver {
  constructor(private readonly filesystem: FileSystemApiService) {}

  @Query(() => FileSystemRootConnectionModel)
  async fileSystemRoots(@Args('data', { nullable: true }) data?: FileSystemPageInput) {
    return this.filesystem.getRoots(data ?? {});
  }

  @Query(() => FileSystemEntryModel)
  async fileSystemEntry(@Args('data') data: FileSystemEntryInput) {
    return this.filesystem.getEntry(data);
  }

  @Query(() => FileSystemDirectoryModel)
  async fileSystemDirectory(@Args('data') data: FileSystemDirectoryInput) {
    return this.filesystem.getDirectory(data);
  }

  @Mutation(() => FileSystemEntryModel)
  async createFileSystemDirectory(@Args('data') data: CreateFileSystemDirectoryInput) {
    return this.filesystem.createDirectory(data);
  }
}
