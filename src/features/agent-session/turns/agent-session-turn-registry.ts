import { Injectable } from '@nestjs/common';
import type { AgentSessionTurn, AgentSessionTurnResult } from '@revisium/revo-agent-runtime';

import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../infrastructure/agent-runtime/agent-session.errors.js';

interface TrackedTurn {
  readonly handle: AgentSessionTurn;
  readonly completion: Promise<AgentSessionTurnResult>;
  state: 'running' | 'completed';
  result?: AgentSessionTurnResult;
  failure?: unknown;
}

@Injectable()
export class AgentSessionTurnRegistry {
  private static readonly capacity = 1_000;
  private readonly turns = new Map<string, TrackedTurn>();
  private pending = 0;

  reserve(): () => void {
    for (const [id, turn] of this.turns) {
      if (this.turns.size + this.pending < AgentSessionTurnRegistry.capacity) {
        break;
      }

      if (turn.state === 'completed') {
        this.turns.delete(id);
      }
    }

    if (this.turns.size + this.pending >= AgentSessionTurnRegistry.capacity) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.unavailable,
        'Agent session turn retention limit is reached.',
      );
    }

    this.pending += 1;
    let released = false;

    return () => {
      if (!released) {
        this.pending -= 1;
        released = true;
      }
    };
  }

  add(handle: AgentSessionTurn): TrackedTurn {
    const tracked: TrackedTurn = {
      handle,
      completion: handle.result(),
      state: 'running',
    };
    this.turns.set(handle.turnId, tracked);
    void tracked.completion.then(
      (result) => {
        tracked.state = 'completed';
        tracked.result = result;
      },
      (error_: unknown) => {
        tracked.state = 'completed';
        tracked.failure = error_;
      },
    );

    return tracked;
  }

  get(turnId: string): TrackedTurn | undefined {
    return this.turns.get(turnId);
  }
}
