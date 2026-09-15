export type ReleaseProjectRunCommandData = {
  readonly projectId: string;
  readonly runId: string;
};

export type ReleaseProjectRunCommandReturnType = void;

export class ReleaseProjectRunCommand {
  constructor(readonly data: ReleaseProjectRunCommandData) {}
}
