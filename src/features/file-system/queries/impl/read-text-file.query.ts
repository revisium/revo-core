export type ReadTextFileQueryData = { readonly path: string };

export class ReadTextFileQuery {
  constructor(readonly data: ReadTextFileQueryData) {}
}
