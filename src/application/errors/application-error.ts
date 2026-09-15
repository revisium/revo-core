export class ApplicationError<
  TCode extends string = string,
  TDetails extends object = Record<string, never>,
> extends Error {
  constructor(
    readonly code: TCode,
    readonly details: TDetails,
  ) {
    super(code);
    this.name = 'ApplicationError';
  }
}
