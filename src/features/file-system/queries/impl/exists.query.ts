export type ExistsQueryData = { path: string };

export class ExistsQuery {
  constructor(readonly data: ExistsQueryData) {}
}
