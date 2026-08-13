import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';

import { ProjectApiService } from './project-api.service.js';

@Injectable()
export class UserProjectMigrationsService implements OnApplicationBootstrap {
  constructor(private readonly projects: ProjectApiService) {}

  onApplicationBootstrap(): Promise<void> {
    return this.applyToUserProjects();
  }

  private async applyToUserProjects(): Promise<void> {
    const projectIds = await this.projects.listUserProjectIds();
    for (const projectId of projectIds) {
      // oxlint-disable-next-line no-await-in-loop -- Apply one project at a time. The first failure aborts bootstrap.
      await this.projects.applyContentModel(projectId);
    }
  }
}
