export type GetRunProjectIdQueryData = {
  readonly runId: string;
};

export type GetRunProjectIdQueryReturnType = string | null;

export class GetRunProjectIdQuery {
  constructor(readonly data: GetRunProjectIdQueryData) {}
}
