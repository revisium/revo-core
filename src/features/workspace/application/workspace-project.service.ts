import { Injectable } from '@nestjs/common';

import { PublicProjectStatus } from '../../project/contracts/project.enums.js';
import { ProjectApiService } from '../../project/project-api.service.js';
import { WorkspaceError } from '../contracts/workspace.errors.js';

@Injectable()
export class WorkspaceProjectService {
  constructor(private readonly projects: ProjectApiService) {}

  async assertAccessible(projectId: string, writable = false): Promise<void> {
    const project = await this.projects.getUserProject(projectId);

    if (project === null) {
      throw new WorkspaceError({ code: 'WORKSPACE_PROJECT_NOT_FOUND', details: {} });
    }

    if (writable && project.status !== PublicProjectStatus.active) {
      throw new WorkspaceError({ code: 'WORKSPACE_PROJECT_ARCHIVED', details: {} });
    }
  }
}
