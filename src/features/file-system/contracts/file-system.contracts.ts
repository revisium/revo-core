export enum FileSystemPermission {
  LIST = 'LIST',
  READ_METADATA = 'READ_METADATA',
  READ_FILE = 'READ_FILE',
  CREATE_FILE = 'CREATE_FILE',
  CREATE_DIRECTORY = 'CREATE_DIRECTORY',
  WRITE_FILE = 'WRITE_FILE',
  COPY = 'COPY',
  MOVE = 'MOVE',
  DELETE = 'DELETE',
}

export type FileSystemPathRule = {
  readonly path: string;
  readonly match: 'EXACT' | 'SUBTREE';
  readonly allow?: readonly FileSystemPermission[];
  readonly deny?: readonly FileSystemPermission[];
};

export type FileSystemPermissionSet = {
  readonly allow: readonly FileSystemPermission[];
  readonly deny?: readonly FileSystemPermission[];
  readonly rules?: readonly FileSystemPathRule[];
};

export type FileSystemScope = FileSystemPermissionSet & { readonly rootPath: string };

export type FileSystemAccessPolicy = {
  readonly scopes: readonly FileSystemScope[];
};

export enum FileSystemEntryType {
  FILE = 'FILE',
  DIRECTORY = 'DIRECTORY',
  SYMLINK = 'SYMLINK',
  OTHER = 'OTHER',
}

export enum FileSystemRootType {
  HOME = 'HOME',
  ROOT = 'ROOT',
  VOLUME = 'VOLUME',
  SCOPE = 'SCOPE',
}

export type FileSystemEntry = {
  name: string;
  path: string;
  type: FileSystemEntryType;
  isSymlink: boolean;
};

export type FileSystemRoot = {
  name: string;
  path: string;
  type: FileSystemRootType;
};

export type FileSystemPage<T> = {
  edges: { cursor: string; node: T }[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
  };
};

export type FileSystemPageOptions = { first?: number; after?: string };
export type FileSystemDirectoryOptions = FileSystemPageOptions & {
  directoriesOnly?: boolean;
  includeHidden?: boolean;
};
export type FileSystemDirectory = {
  path: string;
  parentPath: string | null;
  entries: FileSystemPage<FileSystemEntry>;
};

export { FileSystemAccessContext } from './file-system-access-context.js';
