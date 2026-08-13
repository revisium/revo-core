export type ApplyContentModelCommandData = {
  readonly projectId: string;
};

export type ApplyContentModelCommandReturnType = boolean;

export class ApplyContentModelCommand {
  constructor(readonly data: ApplyContentModelCommandData) {}
}
