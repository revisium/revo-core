import type { RunEventPage, RunEventPageInput } from '@revisium/revo-run';

export type GetRunEventsQueryData = {
  readonly runId: string;
  readonly page?: RunEventPageInput;
};

export type GetRunEventsQueryReturnType = RunEventPage;

export class GetRunEventsQuery {
  constructor(readonly data: GetRunEventsQueryData) {}
}
