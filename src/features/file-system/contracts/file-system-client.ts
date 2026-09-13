import type {
  FileSystemAccessContext,
  FileSystemDirectory,
  FileSystemDirectoryOptions,
  FileSystemEntry,
  FileSystemPage,
  FileSystemPageOptions,
  FileSystemRoot,
} from './file-system.contracts.js';

export type FileSystemAccessSource =
  | FileSystemAccessContext
  | (() => Promise<FileSystemAccessContext>);

export interface FileSystemClient {
  getRoots(data: FileSystemPageOptions): Promise<FileSystemPage<FileSystemRoot>>;
  getEntry(data: { path: string }): Promise<FileSystemEntry>;
  getDirectory(data: { path: string } & FileSystemDirectoryOptions): Promise<FileSystemDirectory>;
  createDirectory(data: { parentPath: string; name: string }): Promise<FileSystemEntry>;
  readTextFile(data: { path: string }): Promise<string>;
  exists(data: { path: string }): Promise<boolean>;
  isDirectory(data: { path: string }): Promise<boolean>;
  canonicalize(data: { path: string }): Promise<string>;
}
