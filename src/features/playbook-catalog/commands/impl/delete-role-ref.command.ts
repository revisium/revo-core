export type DeleteRoleRefCommandData = {
  readonly id: string;
};

export type DeleteRoleRefCommandReturnType = boolean;

export class DeleteRoleRefCommand {
  constructor(readonly data: DeleteRoleRefCommandData) {}
}
