import { registerEnumType } from '@nestjs/graphql';

import {
  WorkspaceType,
  WorkspaceAvailability,
} from '../../../features/workspace/contracts/workspace.contracts.js';

export function registerWorkspaceEnums(): void {
  registerEnumType(WorkspaceType, { name: 'WorkspaceType' });
  registerEnumType(WorkspaceAvailability, { name: 'WorkspaceAvailability' });
}
