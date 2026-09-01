import type { RunDetails } from '@revisium/revo-run';

export type GetRunDetailsQueryData = {
  readonly runId: string;
};

export type GetRunDetailsQueryReturnType = RunDetails | undefined;

export class GetRunDetailsQuery {
  constructor(readonly data: GetRunDetailsQueryData) {}
}
