import { registerEnumType } from '@nestjs/graphql';

import {
  CatalogChangeType,
  CatalogScope,
  CatalogTable,
  LaunchProfileStatus,
  MethodDocumentKind,
  PipelineRoleMembership,
  PipelineStrategy,
} from '../../features/playbook-catalog/constants/catalog.constants.js';
import { AdrStatus } from './project/model/adr-status.enum.js';
import { RequirementStatus } from './project/model/requirement-status.enum.js';
import { WorkPlanStatus } from './project/model/work-plan-status.enum.js';

export function initRegisterEnumTypes(): void {
  registerEnumType(AdrStatus, { name: 'AdrStatus' });
  registerEnumType(RequirementStatus, { name: 'RequirementStatus' });
  registerEnumType(WorkPlanStatus, { name: 'WorkPlanStatus' });
  registerEnumType(CatalogScope, { name: 'CatalogScope' });
  registerEnumType(CatalogTable, { name: 'CatalogTable' });
  registerEnumType(CatalogChangeType, { name: 'CatalogChangeType' });
  registerEnumType(MethodDocumentKind, { name: 'MethodDocumentKind' });
  registerEnumType(PipelineRoleMembership, { name: 'PipelineRoleMembership' });
  registerEnumType(LaunchProfileStatus, { name: 'LaunchProfileStatus' });
  registerEnumType(PipelineStrategy, { name: 'PipelineStrategy' });
}
