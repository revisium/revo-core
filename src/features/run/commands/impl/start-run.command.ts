import type { JsonValue, PipelineSourcePackage, RunProfile } from '@revisium/revo-run';

export type StartRunCommandData = {
  readonly pipelineId?: string;
  readonly pipeline?: PipelineSourcePackage;
  readonly profileId?: string;
  readonly profile?: RunProfile;
  readonly input: JsonValue;
};

export type StartRunCommandReturnType = {
  readonly runId: string;
};

export class StartRunCommand {
  constructor(readonly data: StartRunCommandData) {}
}
