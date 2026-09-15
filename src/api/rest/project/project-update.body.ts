import { BadRequestException } from '@nestjs/common';

import type { UpdateUserProjectCommandData } from '../../../features/project/commands/index.js';
import { ProjectPublicMessage } from '../../errors/project-public-messages.js';
import type { ProjectUpdateRequest } from './dto/project-update.request.js';

export function projectUpdateBody(id: string, data: unknown): UpdateUserProjectCommandData {
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new BadRequestException(ProjectPublicMessage.updateBodyInvalid);
  }

  const request = data as ProjectUpdateRequest;

  return {
    id,
    ...(request.name === undefined ? {} : { name: request.name }),
    ...(request.description === undefined ? {} : { description: request.description }),
  };
}
