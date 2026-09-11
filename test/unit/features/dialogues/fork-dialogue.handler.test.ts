import { expect, test, vi } from 'vitest';

import { ForkDialogueHandler } from '../../../../src/features/dialogues/management/commands/handlers/fork-dialogue.handler.js';
import { ForkDialogueCommand } from '../../../../src/features/dialogues/management/commands/impl/fork-dialogue.command.js';

test('rejects a corrupt stored configuration before creating a fork', async () => {
  const findFirst = vi.fn<() => void>();
  const create = vi.fn<() => void>();
  const transactions = {
    getTransaction: () => ({
      dialogue: {
        findUnique: vi.fn<
          () => Promise<{ id: string; agentConfiguration: { selections: number } }>
        >(async () => ({ id: 'origin', agentConfiguration: { selections: 42 } })),
        create,
      },
      dialogueTurn: { findFirst },
    }),
    runReadCommitted: async <Value>(callback: () => Promise<Value>) => callback(),
  };
  const changes = {
    lockWriter: vi.fn<() => Promise<void>>(async () => undefined),
  };
  const handler = new ForkDialogueHandler(transactions as never, changes as never);

  await expect(
    handler.execute(
      new ForkDialogueCommand({ dialogueId: 'origin', turnId: 'turn', title: 'Fork' }),
    ),
  ).rejects.toBeInstanceOf(Error);

  expect(findFirst).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
});
