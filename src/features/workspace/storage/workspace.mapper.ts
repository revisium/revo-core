import type { Workspace } from '../../../__generated__/client/client.js';
import type { WorkspaceRecord } from '../contracts/workspace.contracts.js';

export function toWorkspace(workspace: Workspace): WorkspaceRecord {
  return {
    ...workspace,
    createdAt: workspace.createdAt.toISOString(),
    updatedAt: workspace.updatedAt.toISOString(),
    archivedAt: workspace.archivedAt?.toISOString() ?? null,
  };
}
