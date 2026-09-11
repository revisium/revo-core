import { expect, test, vi } from 'vitest';

import { CreateDialogueHandler } from '../../../../src/features/dialogues/management/commands/handlers/create-dialogue.handler.js';
import { CreateDialogueCommand } from '../../../../src/features/dialogues/management/commands/impl/create-dialogue.command.js';

test('persists the decoded configuration snapshot after input mutation', async () => {
  const input = {
    agentConfiguration: { selections: { model: 'original' } },
    agentId: 'agent',
    agentVersion: '1',
    metadata: {},
    systemContext: '',
    title: 'Dialogue',
  };
  const create = vi.fn<(...args: never[]) => Promise<Record<string, unknown>>>(async () => ({
    activeTurnId: null,
    agentConfiguration: { selections: { model: 'original' } },
    agentId: 'agent',
    agentVersion: '1',
    contextMode: 'NEW',
    createdAt: new Date(),
    id: 'dialogue',
    lastOutcome: null,
    metadata: {},
    originDialogueId: null,
    originItemSequence: null,
    originTurnId: null,
    pendingCount: 0,
    progress: '',
    readSignificantSequence: 0n,
    runtimeSessionId: null,
    significantSequence: 0n,
    status: 'READY',
    systemContext: '',
    title: 'Dialogue',
    updatedAt: new Date(),
    version: 1n,
  }));
  const changes = {
    append: vi.fn<(...args: never[]) => Promise<void>>(async () => undefined),
    lockWriter: vi.fn<(...args: never[]) => Promise<void>>(async () => {
      input.agentConfiguration.selections.model = 'mutated';
    }),
  };
  const transactions = {
    getTransaction: () => ({ dialogue: { create } }),
    runReadCommitted: async <Value>(callback: (transaction: never) => Promise<Value>) =>
      callback(undefined as never),
  };
  const handler = new CreateDialogueHandler(transactions as never, changes as never);

  await handler.execute(new CreateDialogueCommand(input));

  expect(create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        agentConfiguration: { selections: { model: 'original' } },
      }),
    }),
  );
});
