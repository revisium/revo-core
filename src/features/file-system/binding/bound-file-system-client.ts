import type { FileSystemClient, FileSystemAccessSource } from '../contracts/file-system-client.js';
import type { FileSystemApiService } from '../file-system-api.service.js';

export class BoundFileSystemClient implements FileSystemClient {
  constructor(
    private readonly api: FileSystemApiService,
    private readonly source: FileSystemAccessSource,
  ) {
    Object.freeze(this);
  }

  async getRoots(
    data: Parameters<FileSystemClient['getRoots']>[0],
  ): ReturnType<FileSystemClient['getRoots']> {
    const context = typeof this.source === 'function' ? await this.source() : this.source;

    return this.api.getRoots(data, context);
  }

  async getEntry(
    data: Parameters<FileSystemClient['getEntry']>[0],
  ): ReturnType<FileSystemClient['getEntry']> {
    const context = typeof this.source === 'function' ? await this.source() : this.source;

    return this.api.getEntry(data, context);
  }

  async getDirectory(
    data: Parameters<FileSystemClient['getDirectory']>[0],
  ): ReturnType<FileSystemClient['getDirectory']> {
    const context = typeof this.source === 'function' ? await this.source() : this.source;

    return this.api.getDirectory(data, context);
  }

  async createDirectory(
    data: Parameters<FileSystemClient['createDirectory']>[0],
  ): ReturnType<FileSystemClient['createDirectory']> {
    const context = typeof this.source === 'function' ? await this.source() : this.source;

    return this.api.createDirectory(data, context);
  }

  async readTextFile(
    data: Parameters<FileSystemClient['readTextFile']>[0],
  ): ReturnType<FileSystemClient['readTextFile']> {
    const context = typeof this.source === 'function' ? await this.source() : this.source;

    return this.api.readTextFile(data, context);
  }

  async exists(
    data: Parameters<FileSystemClient['exists']>[0],
  ): ReturnType<FileSystemClient['exists']> {
    const context = typeof this.source === 'function' ? await this.source() : this.source;

    return this.api.exists(data, context);
  }

  async isDirectory(
    data: Parameters<FileSystemClient['isDirectory']>[0],
  ): ReturnType<FileSystemClient['isDirectory']> {
    const context = typeof this.source === 'function' ? await this.source() : this.source;

    return this.api.isDirectory(data, context);
  }

  async canonicalize(
    data: Parameters<FileSystemClient['canonicalize']>[0],
  ): ReturnType<FileSystemClient['canonicalize']> {
    const context = typeof this.source === 'function' ? await this.source() : this.source;

    return this.api.canonicalize(data, context);
  }
}
