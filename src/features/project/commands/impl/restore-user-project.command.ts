export type RestoreUserProjectCommandData = {
  readonly projectId: string;
};

export type RestoreUserProjectCommandReturnType = boolean;

export class RestoreUserProjectCommand {
  constructor(readonly data: RestoreUserProjectCommandData) {}
}
