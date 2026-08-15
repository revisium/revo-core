export type DeleteLaunchProfileCommandData = {
  readonly id: string;
};

export type DeleteLaunchProfileCommandReturnType = boolean;

export class DeleteLaunchProfileCommand {
  constructor(readonly data: DeleteLaunchProfileCommandData) {}
}
