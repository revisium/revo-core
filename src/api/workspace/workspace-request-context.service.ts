import { Injectable } from '@nestjs/common';

import type { WorkspaceActorContext } from '../../features/workspace/contracts/workspace.contracts.js';
import { FileSystemBrowserAccessService } from '../file-system/file-system-browser-access.service.js';

@Injectable()
export class WorkspaceRequestContextService {
  constructor(private readonly access: FileSystemBrowserAccessService) {}

  async getContext(checkSource: boolean): Promise<WorkspaceActorContext> {
    return {
      actorId: 'system:local-api',
      ...(checkSource ? { fileSystemAccess: await this.access.getContext() } : {}),
    };
  }
}
