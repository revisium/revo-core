import type {
  FileSystemPage,
  FileSystemRoot,
  FileSystemPageOptions,
} from '../../contracts/file-system.contracts.js';

export type GetRootsQueryData = FileSystemPageOptions;
export type GetRootsQueryReturnType = FileSystemPage<FileSystemRoot>;

export class GetRootsQuery {
  constructor(readonly data: GetRootsQueryData) {}
}
