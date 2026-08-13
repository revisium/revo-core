import { OmitType } from '@nestjs/swagger';

import { WorkPlanRequest } from './work-plan.request.js';

export class WorkPlanUpdateRequest extends OmitType(WorkPlanRequest, ['id'] as const) {}
