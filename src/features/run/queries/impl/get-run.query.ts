import type { RunSnapshot } from '@revisium/revo-run';

export type GetRunQueryData = {
  readonly runId: string;
};

export type GetRunQueryReturnType = RunSnapshot | undefined;

export class GetRunQuery {
  constructor(readonly data: GetRunQueryData) {}
}
