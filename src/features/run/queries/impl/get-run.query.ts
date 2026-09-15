import type { RunSnapshot } from '@revisium/revo-run';

export type GetRunQueryData = {
  readonly runId: string;
};

export type RunSnapshotWithProject = RunSnapshot & { readonly projectId: string | null };

export type GetRunQueryReturnType = RunSnapshotWithProject | undefined;

export class GetRunQuery {
  constructor(readonly data: GetRunQueryData) {}
}
