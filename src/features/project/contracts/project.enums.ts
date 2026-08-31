import { ProjectStatus } from '../../../__generated__/client/enums.js';

export enum PublicProjectStatus {
  active = 'active',
  archived = 'archived',
}

export function toPublicProjectStatus(status: ProjectStatus): PublicProjectStatus {
  switch (status) {
    case ProjectStatus.ACTIVE:
      return PublicProjectStatus.active;
    case ProjectStatus.ARCHIVED:
      return PublicProjectStatus.archived;
    case ProjectStatus.CREATING:
    default:
      throw new Error('A project that is still being created has no public status.');
  }
}
