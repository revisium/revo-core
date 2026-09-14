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
