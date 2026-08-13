export type CreateUserProjectCommandData = {
  readonly name: string;
};

export type CreateUserProjectCommandReturnType = string;

export class CreateUserProjectCommand {
  constructor(readonly data: CreateUserProjectCommandData) {}
}
