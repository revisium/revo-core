export type ApplicationFailure = Readonly<{ code: string; details: object }>;

export class ApplicationError<TFailure extends ApplicationFailure> extends Error {
  constructor(readonly failure: TFailure) {
    super(failure.code);
    this.name = 'ApplicationError';
  }
}
