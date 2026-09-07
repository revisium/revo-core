import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { DialogueApiService } from '../dialogue-api.service.js';

@Injectable()
export class DialogueStartupReconciliation implements OnApplicationBootstrap {
  constructor(private readonly dialogues: DialogueApiService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.dialogues.reconcileRuntimeState();
  }
}
