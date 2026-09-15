export type ReserveProjectRunCommandData = {
  readonly projectId: string;
  readonly runId: string;
};

export type ReserveProjectRunCommandReturnType = void;

export class ReserveProjectRunCommand {
  constructor(readonly data: ReserveProjectRunCommandData) {}
}
