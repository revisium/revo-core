export type UpdateUserProjectCommandData = {
  readonly id: string;
  readonly name?: string;
  readonly description?: string;
};

export type UpdateUserProjectCommandReturnType = boolean;

export class UpdateUserProjectCommand {
  constructor(readonly data: UpdateUserProjectCommandData) {}
}
