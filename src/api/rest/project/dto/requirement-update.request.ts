import { OmitType } from '@nestjs/swagger';

import { RequirementRequest } from './requirement.request.js';

export class RequirementUpdateRequest extends OmitType(RequirementRequest, ['id'] as const) {}
