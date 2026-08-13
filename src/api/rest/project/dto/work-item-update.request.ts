import { OmitType } from '@nestjs/swagger';

import { WorkItemRequest } from './work-item.request.js';

export class WorkItemUpdateRequest extends OmitType(WorkItemRequest, ['id'] as const) {}
