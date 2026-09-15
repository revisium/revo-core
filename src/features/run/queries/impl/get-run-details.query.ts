import type { RunDetails } from '@revisium/revo-run';

export type GetRunDetailsQueryData = {
  readonly runId: string;
};

export type RunDetailsWithProject = RunDetails & { readonly projectId: string | null };

export type GetRunDetailsQueryReturnType = RunDetailsWithProject | undefined;

export class GetRunDetailsQuery {
  constructor(readonly data: GetRunDetailsQueryData) {}
}
