export type IsDirectoryQueryData = { path: string };

export class IsDirectoryQuery {
  constructor(readonly data: IsDirectoryQueryData) {}
}
