import type { JsonValue, PipelineDefinition } from '@revisium/revo-pipeline';

export type StartRunCommandData = {
  readonly pipeline: PipelineDefinition;
  readonly input: JsonValue;
};

export type StartRunCommandReturnType = {
  readonly runId: string;
};

export class StartRunCommand {
  constructor(readonly data: StartRunCommandData) {}
}
