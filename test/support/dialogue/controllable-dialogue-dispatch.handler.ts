import { Injectable } from '@nestjs/common';

import { DialogueTurnSavedEvent } from '../../../src/features/dialogue/events/dialogue-turn-saved.event.js';
import { DispatchDialogueTurnHandler } from '../../../src/features/dialogue/events/dispatch-dialogue-turn.handler.js';

@Injectable()
export class ControllableDialogueDispatchHandler extends DispatchDialogueTurnHandler {
  private dispatchBarrier:
    | { readonly reached: () => void; readonly release: Promise<void> }
    | undefined;

  holdNextDispatch(): { readonly reached: Promise<void>; release(): void } {
    if (this.dispatchBarrier !== undefined) {
      throw new Error('A dispatch barrier is already active.');
    }

    const reached = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    this.dispatchBarrier = { reached: reached.resolve, release: release.promise };

    return { reached: reached.promise, release: release.resolve };
  }

  override handle(event: DialogueTurnSavedEvent): void {
    const barrier = this.dispatchBarrier;

    if (barrier === undefined) {
      super.handle(event);

      return;
    }

    this.dispatchBarrier = undefined;
    barrier.reached();
    void barrier.release.then(() => super.handle(event));
  }
}
