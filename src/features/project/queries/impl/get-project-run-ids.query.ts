export type GetProjectRunIdsQueryData = {
  readonly projectId: string;
};

export type GetProjectRunIdsQueryReturnType = readonly string[];

export class GetProjectRunIdsQuery {
  constructor(readonly data: GetProjectRunIdsQueryData) {}
}
