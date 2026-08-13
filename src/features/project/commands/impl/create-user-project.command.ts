export type CreateUserProjectCommandData = {
  readonly name: string;
};

export type CreateUserProjectCommandReturnType = {
  id: string;
  name: string;
};

export class CreateUserProjectCommand {
  constructor(readonly data: CreateUserProjectCommandData) {}
}
