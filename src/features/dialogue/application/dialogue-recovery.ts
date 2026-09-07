import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { DialogueApiService } from '../dialogue-api.service.js';

@Injectable()
export class DialogueRecovery implements OnApplicationBootstrap {
  constructor(private readonly dialogues: DialogueApiService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.dialogues.recover();
  }
}
