import { Injectable } from '@nestjs/common';
import { EngineApiService } from '@revisium/engine';

const DEFAULT_BRANCH_NAME = 'master';

@Injectable()
export class ProjectDraftService {
  constructor(private readonly engine: EngineApiService) {}

  async getDraftRevisionId(projectId: string): Promise<string> {
    const branch = await this.engine.getBranch({
      projectId,
      branchName: DEFAULT_BRANCH_NAME,
    });
    const draft = await this.engine.getDraftRevision(branch.id);
    return draft.id;
  }

  toRecord(row: { id: string; data: unknown }): { id: string } & Record<string, unknown> {
    const fields: Record<string, unknown> = {};
    if (typeof row.data === 'object' && row.data !== null && !Array.isArray(row.data)) {
      for (const [key, value] of Object.entries(row.data)) {
        fields[key] = value;
      }
    }

    return { id: row.id, ...fields };
  }
}
