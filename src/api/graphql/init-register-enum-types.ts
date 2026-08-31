import { registerEnumType } from '@nestjs/graphql';

import { CatalogTable } from '../../features/playbook-catalog/contracts/catalog-table.js';
import {
  CatalogChangeType,
  CatalogScope,
  LaunchProfileStatus,
  MethodDocumentKind,
  PipelineRoleMembership,
} from '../../features/playbook-catalog/contracts/catalog.enums.js';
import { PublicProjectStatus } from '../../features/project/contracts/project.enums.js';
import { AdrStatus } from './project/model/adr-status.enum.js';
import { RequirementStatus } from './project/model/requirement-status.enum.js';
import { WorkPlanStatus } from './project/model/work-plan-status.enum.js';

export function initRegisterEnumTypes(): void {
  registerEnumType(PublicProjectStatus, { name: 'ProjectStatus' });
  registerEnumType(AdrStatus, { name: 'AdrStatus' });
  registerEnumType(RequirementStatus, { name: 'RequirementStatus' });
  registerEnumType(WorkPlanStatus, { name: 'WorkPlanStatus' });
  registerEnumType(CatalogScope, { name: 'CatalogScope' });
  registerEnumType(CatalogTable, { name: 'CatalogTable' });
  registerEnumType(CatalogChangeType, { name: 'CatalogChangeType' });
  registerEnumType(MethodDocumentKind, { name: 'MethodDocumentKind' });
  registerEnumType(PipelineRoleMembership, { name: 'PipelineRoleMembership' });
  registerEnumType(LaunchProfileStatus, { name: 'LaunchProfileStatus' });
}
