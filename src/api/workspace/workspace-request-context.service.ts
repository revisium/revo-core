import { Injectable } from '@nestjs/common';

import type { WorkspaceActorContext } from '../../features/workspace/contracts/workspace.contracts.js';

@Injectable()
export class WorkspaceRequestContextService {
  getContext(): WorkspaceActorContext {
    return {
      actorId: 'system:local-api',
    };
  }
}
