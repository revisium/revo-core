import { BadRequestException } from '@nestjs/common';

import type { UpdateUserProjectCommandData } from '../../../features/project/commands/index.js';
import { ProjectError } from '../../../features/project/contracts/project.errors.js';
import type { ProjectUpdateRequest } from './dto/project-update.request.js';

export function projectUpdateBody(id: string, data: unknown): UpdateUserProjectCommandData {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new BadRequestException(ProjectError.updateBodyInvalid);
  }

  const request = data as ProjectUpdateRequest;

  return {
    id,
    ...(request.name === undefined ? {} : { name: request.name }),
    ...(request.description === undefined ? {} : { description: request.description }),
  };
}
