export type CreateUserProjectCommandData = {
  readonly name: string;
  readonly description?: string;
};

export type CreateUserProjectCommandReturnType = {
  readonly projectId: string;
};

export class CreateUserProjectCommand {
  constructor(readonly data: CreateUserProjectCommandData) {}
}
