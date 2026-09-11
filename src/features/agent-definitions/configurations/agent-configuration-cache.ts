import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import type { AgentConfigurationCatalog } from '@revisium/revo-agent-runtime';

import {
  AgentConfigurationsStatus,
  type AgentConfigurationsSnapshot,
} from '../contracts/agent-configurations.contracts.js';

@Injectable()
export class AgentConfigurationCache implements OnModuleDestroy {
  private state: AgentConfigurationsSnapshot = Object.freeze({
    status: AgentConfigurationsStatus.NOT_INITIALIZED,
    catalogs: Object.freeze([]),
  });
  private readonly listeners = new Set<(state?: AgentConfigurationsSnapshot) => void>();
  private closed = false;

  snapshot(): AgentConfigurationsSnapshot {
    return this.state;
  }

  begin(): void {
    this.update(AgentConfigurationsStatus.LOADING, []);
  }

  publish(catalogs: readonly AgentConfigurationCatalog[]): void {
    this.update(AgentConfigurationsStatus.READY, catalogs);
  }

  watch(): AsyncIterableIterator<AgentConfigurationsSnapshot> {
    let nextState: AgentConfigurationsSnapshot | undefined = this.state;
    let closed = this.closed;
    let pending: ((result: IteratorResult<AgentConfigurationsSnapshot>) => void) | undefined;
    const receive = (state?: AgentConfigurationsSnapshot) => {
      closed ||= state === undefined;
      nextState = state;

      if (pending !== undefined) {
        const resolve = pending;
        pending = undefined;
        nextState = undefined;
        resolve(
          state === undefined ? { done: true, value: undefined } : { done: false, value: state },
        );
      }
    };

    if (!closed) {
      this.listeners.add(receive);
    }

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      next: () => {
        if (closed) {
          return Promise.resolve({ done: true, value: undefined });
        }

        if (nextState !== undefined) {
          const value = nextState;
          nextState = undefined;

          return Promise.resolve({ done: false, value });
        }

        return new Promise((resolve) => {
          pending = resolve;
        });
      },
      return: () => {
        this.listeners.delete(receive);
        receive();

        return Promise.resolve({ done: true, value: undefined });
      },
    };
  }

  onModuleDestroy(): void {
    this.closed = true;

    for (const receive of this.listeners) {
      receive();
    }
    this.listeners.clear();
  }

  private update(
    status: AgentConfigurationsStatus,
    catalogs: readonly AgentConfigurationCatalog[],
  ): void {
    if (this.closed) {
      return;
    }
    this.state = Object.freeze({ status, catalogs: Object.freeze([...catalogs]) });

    for (const receive of this.listeners) {
      receive(this.state);
    }
  }
}
