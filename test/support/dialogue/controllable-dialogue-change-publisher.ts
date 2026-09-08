import { Injectable } from '@nestjs/common';

import {
  DialogueChangePublisher,
  type DialogueChangeData,
} from '../../../src/infrastructure/dialogue/dialogue-change-publisher.js';

@Injectable()
export class ControllableDialogueChangePublisher extends DialogueChangePublisher {
  private changeBarrier:
    | {
        readonly reached: () => void;
        readonly release: Promise<void>;
      }
    | undefined;

  holdAndFailAfterNextChange(): { readonly reached: Promise<void>; fail(): void } {
    if (this.changeBarrier !== undefined) {
      throw new Error('A dialogue change barrier is already active.');
    }

    const reached = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    this.changeBarrier = { reached: reached.resolve, release: release.promise };

    return { reached: reached.promise, fail: release.resolve };
  }

  override async append(dialogueId: string, data: DialogueChangeData): Promise<bigint> {
    const sequence = await super.append(dialogueId, data);
    const barrier = this.changeBarrier;

    if (barrier !== undefined) {
      this.changeBarrier = undefined;
      barrier.reached();
      await barrier.release;
      throw new Error('Controlled failure after held dialogue change insertion.');
    }

    return sequence;
  }
}
