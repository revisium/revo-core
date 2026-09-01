import type { Prisma } from '../../../../__generated__/client/client.js';
import { toPublicProjectStatus } from '../../contracts/project.enums.js';
import type { GetUserProjectQueryReturnType } from '../impl/get-user-project.query.js';

export const USER_PROJECT_SELECT = {
  id: true,
  name: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.ProjectSelect;

type StoredUserProject = Prisma.ProjectGetPayload<{ select: typeof USER_PROJECT_SELECT }>;

export function toUserProject(
  project: StoredUserProject,
): NonNullable<GetUserProjectQueryReturnType> {
  return {
    ...project,
    status: toPublicProjectStatus(project.status),
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
