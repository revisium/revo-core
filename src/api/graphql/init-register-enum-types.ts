import { registerEnumType } from '@nestjs/graphql';

import { AdrStatus } from './project/model/adr-status.enum.js';
import { RequirementStatus } from './project/model/requirement-status.enum.js';
import { WorkPlanStatus } from './project/model/work-plan-status.enum.js';

export function initRegisterEnumTypes(): void {
  registerEnumType(AdrStatus, { name: 'AdrStatus' });
  registerEnumType(RequirementStatus, { name: 'RequirementStatus' });
  registerEnumType(WorkPlanStatus, { name: 'WorkPlanStatus' });
}
