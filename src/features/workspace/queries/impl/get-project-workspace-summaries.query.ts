import type { ProjectWorkspaceSummary } from '../../contracts/workspace.contracts.js';

export type GetProjectWorkspaceSummariesQueryData = { projectIds: string[] };
export type GetProjectWorkspaceSummariesQueryReturnType = Record<string, ProjectWorkspaceSummary>;

export class GetProjectWorkspaceSummariesQuery {
  constructor(readonly data: GetProjectWorkspaceSummariesQueryData) {}
}
