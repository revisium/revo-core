import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import { FileSystemEntryType } from '../../contracts/file-system.contracts.js';
import { FileSystemError } from '../../contracts/file-system.error.js';
import { absolutePath, directoryChild } from '../../filesystem/file-system-path.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import {
  CreateDirectoryCommand,
  type CreateDirectoryCommandReturnType,
} from '../impl/create-directory.command.js';

@CommandHandler(CreateDirectoryCommand)
export class CreateDirectoryHandler implements ICommandHandler<
  CreateDirectoryCommand,
  CreateDirectoryCommandReturnType
> {
  constructor(private readonly filesystem: FileSystemService) {}

  async execute(query: CreateDirectoryCommand): Promise<CreateDirectoryCommandReturnType> {
    const { data } = query;
    const parent = absolutePath(data.parentPath);
    const requested = directoryChild(parent, data.name);
    const canonicalParent = await this.filesystem.canonicalize(parent);

    if (!(await this.filesystem.isDirectory(canonicalParent))) {
      if (!(await this.filesystem.exists(canonicalParent))) {
        throw new FileSystemError('FILE_SYSTEM_NOT_FOUND');
      }

      throw new FileSystemError('FILE_SYSTEM_NOT_DIRECTORY');
    }

    const canonical = directoryChild(canonicalParent, data.name);
    await this.filesystem.createDirectory(canonical);

    return {
      path: requested,
      name: data.name,
      type: FileSystemEntryType.DIRECTORY,
      isSymlink: false,
    };
  }
}
