import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import {
  FileSystemPermission,
  FileSystemEntryType,
} from '../../contracts/file-system.contracts.js';
import { FileSystemError } from '../../contracts/file-system.error.js';
import { FileSystemService } from '../../filesystem/file-system.service.js';
import { absolutePath, directoryChild } from '../../policy/file-system-path.js';
import { FileSystemPolicyService } from '../../policy/file-system-policy.service.js';
import {
  CreateDirectoryCommand,
  type CreateDirectoryCommandReturnType,
} from '../impl/create-directory.command.js';

@CommandHandler(CreateDirectoryCommand)
export class CreateDirectoryHandler implements ICommandHandler<
  CreateDirectoryCommand,
  CreateDirectoryCommandReturnType
> {
  constructor(
    private readonly filesystem: FileSystemService,
    private readonly policy: FileSystemPolicyService,
  ) {}

  async execute(query: CreateDirectoryCommand): Promise<CreateDirectoryCommandReturnType> {
    const { context, data } = query;
    const parent = absolutePath(data.parentPath);
    const requested = directoryChild(parent, data.name);
    const canonicalParent = await this.policy.assertAllowed(
      context,
      FileSystemPermission.CREATE_DIRECTORY,
      parent,
    );

    if (!(await this.filesystem.isDirectory(canonicalParent))) {
      if (!(await this.filesystem.exists(canonicalParent))) {
        throw new FileSystemError('FILE_SYSTEM_NOT_FOUND');
      }

      throw new FileSystemError('FILE_SYSTEM_NOT_DIRECTORY');
    }

    const canonical = directoryChild(
      await this.filesystem.canonicalize(canonicalParent),
      data.name,
    );
    await this.policy.assertAllowed(context, FileSystemPermission.CREATE_DIRECTORY, requested);
    await this.policy.assertAllowed(context, FileSystemPermission.CREATE_DIRECTORY, canonical);
    await this.filesystem.createDirectory(canonical);

    return {
      path: requested,
      name: data.name,
      type: FileSystemEntryType.DIRECTORY,
      isSymlink: false,
    };
  }
}
