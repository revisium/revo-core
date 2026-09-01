export type ArchiveUserProjectCommandData = {
  readonly projectId: string;
};

export type ArchiveUserProjectCommandReturnType = boolean;

export class ArchiveUserProjectCommand {
  constructor(readonly data: ArchiveUserProjectCommandData) {}
}
