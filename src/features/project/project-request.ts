import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { ProjectError } from './project-errors.js';
import {
  GetUserProjectQuery,
  type GetUserProjectQueryReturnType,
} from './queries/impl/get-user-project.query.js';
import type { UserProject } from './user-project.js';

const MIN_PAGE_SIZE = 1;
const MAX_PAGE_SIZE = 100;

export function requireRecordId(rowId: string): void {
  if (typeof rowId !== 'string' || rowId.trim() === '') {
    throw new BadRequestException(ProjectError.recordIdRequired);
  }
}

export function requirePageSize(first: number): void {
  if (!Number.isInteger(first) || first < MIN_PAGE_SIZE || first > MAX_PAGE_SIZE) {
    throw new BadRequestException(ProjectError.invalidPageSize);
  }
}

export async function requireUserProject(
  queries: QueryBus,
  projectId: string,
): Promise<UserProject> {
  const project = await queries.execute<GetUserProjectQuery, GetUserProjectQueryReturnType>(
    new GetUserProjectQuery({ id: projectId }),
  );
  if (project === null) {
    throw new NotFoundException(ProjectError.notFound);
  }

  return project;
}
