export type DeleteRoleCommandData = {
  readonly id: string;
};

export type DeleteRoleCommandReturnType = boolean;

export class DeleteRoleCommand {
  constructor(readonly data: DeleteRoleCommandData) {}
}
