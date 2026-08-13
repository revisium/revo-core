export type DeleteUserProjectCommandData = {
  readonly projectId: string;
};

export type DeleteUserProjectCommandReturnType = boolean;

export class DeleteUserProjectCommand {
  constructor(readonly data: DeleteUserProjectCommandData) {}
}
