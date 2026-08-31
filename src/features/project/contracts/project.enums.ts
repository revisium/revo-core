import { ProjectStatus as StoredProjectStatus } from '../../../__generated__/client/enums.js';

export enum ProjectStatus {
  active = 'active',
  archived = 'archived',
}

export function toPublicProjectStatus(status: StoredProjectStatus): ProjectStatus {
  switch (status) {
    case StoredProjectStatus.ACTIVE:
      return ProjectStatus.active;
    case StoredProjectStatus.ARCHIVED:
      return ProjectStatus.archived;
    case StoredProjectStatus.CREATING:
    default:
      throw new Error('A project that is still being created has no public status.');
  }
}
