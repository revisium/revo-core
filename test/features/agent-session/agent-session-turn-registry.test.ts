import type { AgentSessionTurn, AgentSessionTurnResult } from '@revisium/revo-agent-runtime';
import { describe, expect, it } from 'vitest';

import { AgentSessionTurnRegistry } from '../../../src/features/agent-session/turns/agent-session-turn-registry.js';

const completed: AgentSessionTurnResult = {
  status: 'completed',
  message: { role: 'assistant', content: 'done' },
};

const handle = (turnId: string, completion: Promise<AgentSessionTurnResult>): AgentSessionTurn => ({
  sessionId: 'dlg_test',
  turnId,
  result: () => completion,
  cancel: async () => ({ state: 'requested' }),
});

describe('AgentSessionTurnRegistry', () => {
  it('counts pending admissions against capacity and releases a reservation only once', () => {
    const registry = new AgentSessionTurnRegistry();
    const releaseFirst = registry.reserve();
    const reservations = Array.from({ length: 999 }, () => registry.reserve());

    expect(() => registry.reserve()).toThrow('retention limit');

    releaseFirst();
    releaseFirst();
    const release = registry.reserve();

    expect(() => registry.reserve()).toThrow('retention limit');
    release();
    reservations.forEach((releaseReservation) => releaseReservation());
  });

  it('retains a completed result for later inspection', async () => {
    const registry = new AgentSessionTurnRegistry();
    const tracked = registry.add(handle('trn_done', Promise.resolve(completed)));

    await expect(tracked.completion).resolves.toEqual(completed);
    expect(registry.get('trn_done')).toMatchObject({
      state: 'completed',
      result: completed,
    });
  });

  it('does not leave a rejected result marked as running', async () => {
    const registry = new AgentSessionTurnRegistry();
    const failure = new Error('Result collection failed.');
    const tracked = registry.add(handle('trn_failed', Promise.reject(failure)));

    await expect(tracked.completion).rejects.toBe(failure);
    expect(registry.get('trn_failed')).toMatchObject({
      state: 'completed',
      failure,
    });
  });

  it('evicts a completed handle to admit a new turn at capacity', async () => {
    const registry = new AgentSessionTurnRegistry();
    const completions = Array.from(
      { length: 1_000 },
      (_, index) => registry.add(handle('trn_' + index, Promise.resolve(completed))).completion,
    );
    await Promise.all(completions);

    const release = registry.reserve();

    expect(registry.get('trn_0')).toBeUndefined();
    expect(registry.get('trn_999')).toBeDefined();
    release();
  });
});
