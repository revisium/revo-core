import { constants } from 'node:fs';
import { lstat, stat, readdir, mkdir, realpath, open } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

import { Injectable } from '@nestjs/common';

import type { FileSystemEntry } from '../contracts/file-system.contracts.js';
import {
  FileSystemEntryType,
  FileSystemRootType,
  type FileSystemRoot,
} from '../contracts/file-system.contracts.js';
import { FileSystemError, rethrowFileSystemError } from '../contracts/file-system.error.js';

@Injectable()
export class FileSystemService {
  async entry(location: string): Promise<FileSystemEntry> {
    const metadata = await this.metadata(location);

    return {
      name: path.basename(location) || location,
      path: location,
      type: metadata.type,
      isSymlink: metadata.isSymlink,
    };
  }

  async exists(location: string): Promise<boolean> {
    return (await this.metadataOrMissing(location)) !== undefined;
  }

  async isDirectory(location: string): Promise<boolean> {
    return (await this.metadataOrMissing(location))?.type === FileSystemEntryType.DIRECTORY;
  }

  async metadata(location: string) {
    try {
      const link = await lstat(location);
      const target = link.isSymbolicLink() ? await stat(location) : link;

      return {
        type: this.entryType(target),
        isSymlink: link.isSymbolicLink(),
        size: target.size,
        modifiedAt: target.mtime,
      };
    } catch (error) {
      return rethrowFileSystemError(error);
    }
  }

  async readDirectory(location: string) {
    try {
      const entries = await readdir(location, { withFileTypes: true });

      return entries.map((entry) => ({
        name: entry.name,
        path: path.join(location, entry.name),
        type: this.entryType(entry, entry.isSymbolicLink()),
        isSymlink: entry.isSymbolicLink(),
      }));
    } catch (error) {
      return rethrowFileSystemError(error);
    }
  }

  async createDirectory(location: string): Promise<void> {
    try {
      await mkdir(location);
    } catch (error) {
      rethrowFileSystemError(error);
    }
  }

  async canonicalize(location: string): Promise<string> {
    try {
      return await realpath(location);
    } catch (error) {
      return rethrowFileSystemError(error);
    }
  }

  async readTextFile(location: string, maxBytes: number): Promise<string> {
    try {
      const file = await open(location, constants.O_RDONLY | constants.O_NONBLOCK);

      try {
        if (!(await file.stat()).isFile()) {
          throw new FileSystemError('FILE_SYSTEM_INVALID_PATH');
        }

        const buffer = Buffer.alloc(maxBytes + 1);
        let size = 0;

        while (size < buffer.length) {
          // oxlint-disable-next-line no-await-in-loop -- Reads advance one shared file offset.
          const { bytesRead } = await file.read(buffer, size, buffer.length - size, null);

          if (bytesRead === 0) {
            return buffer.subarray(0, size).toString('utf8');
          }

          size += bytesRead;
        }

        throw new FileSystemError('FILE_SYSTEM_TOO_LARGE');
      } finally {
        await file.close();
      }
    } catch (error) {
      return rethrowFileSystemError(error);
    }
  }

  async getRoots(): Promise<FileSystemRoot[]> {
    const home = homedir();
    const roots: FileSystemRoot[] = [{ name: 'Home', path: home, type: FileSystemRootType.HOME }];

    if (process.platform === 'win32') {
      const volumes = await Promise.all(
        Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ').map(async (letter) => {
          const volume = `${letter}:\\`;

          try {
            return (await this.isDirectory(volume))
              ? { name: `${letter}:`, path: volume, type: FileSystemRootType.VOLUME }
              : undefined;
          } catch (error) {
            if (error instanceof FileSystemError && error.code === 'FILE_SYSTEM_ACCESS_DENIED') {
              return undefined;
            }

            throw error;
          }
        }),
      );
      roots.push(...volumes.filter((volume) => volume !== undefined));
    } else {
      roots.push({ name: 'Root', path: path.parse(home).root, type: FileSystemRootType.ROOT });
    }

    return roots;
  }

  private async metadataOrMissing(location: string) {
    try {
      return await this.metadata(location);
    } catch (error) {
      if (error instanceof FileSystemError && error.code === 'FILE_SYSTEM_NOT_FOUND') {
        return undefined;
      }

      throw error;
    }
  }

  private entryType(
    entry: { isDirectory(): boolean; isFile(): boolean },
    isSymlink = false,
  ): FileSystemEntryType {
    if (entry.isDirectory()) {
      return FileSystemEntryType.DIRECTORY;
    }

    if (entry.isFile()) {
      return FileSystemEntryType.FILE;
    }

    if (isSymlink) {
      return FileSystemEntryType.SYMLINK;
    }

    return FileSystemEntryType.OTHER;
  }
}
