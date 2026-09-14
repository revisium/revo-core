import path from 'node:path';

import { Injectable } from '@nestjs/common';

import type { FileSystemEntry } from '../contracts/file-system.contracts.js';
import { FileSystemService } from '../filesystem/file-system.service.js';

@Injectable()
export class FileSystemListingService {
  constructor(private readonly filesystem: FileSystemService) {}

  async entry(location: string): Promise<FileSystemEntry> {
    const metadata = await this.filesystem.metadata(location);

    return {
      name: path.basename(location) || location,
      path: location,
      type: metadata.type,
      isSymlink: metadata.isSymlink,
    };
  }
}
