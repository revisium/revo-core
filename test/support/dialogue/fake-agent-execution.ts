import type { FakeAgentControl, FakeAgentCommand } from './fake-agent-control.js';

type WithoutCommandId<Command> = Command extends { readonly id: string }
  ? Omit<Command, 'id'>
  : never;

export class FakeAgentExecution {
  constructor(
    readonly id: string,
    readonly turnId: string,
    readonly prompt: string,
    private readonly control: FakeAgentControl,
  ) {}

  text(value: string): Promise<void> {
    return this.control.issue(this.id, { kind: 'text', text: value });
  }

  requestPermission(): Promise<void> {
    return this.control.issue(this.id, { kind: 'permission' });
  }

  requestInput(): Promise<void> {
    return this.control.issue(this.id, { kind: 'input' });
  }

  tool(
    toolCallId: string,
    title: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed',
  ): Promise<void> {
    return this.control.issue(this.id, { kind: 'tool', toolCallId, title, status });
  }

  plan(
    entries: readonly {
      readonly content: string;
      readonly priority: 'high' | 'medium' | 'low';
      readonly status: 'pending' | 'in_progress' | 'completed';
    }[],
  ): Promise<void> {
    return this.control.issue(this.id, { kind: 'plan', entries });
  }

  complete(): Promise<void> {
    return this.control.issue(this.id, { kind: 'complete' });
  }

  fail(): Promise<void> {
    return this.control.issue(this.id, { kind: 'fail' });
  }

  waitForCancellation(): Promise<void> {
    return this.control.issue(this.id, { kind: 'wait_for_cancellation' });
  }

  exit(): Promise<void> {
    return this.control.issue(this.id, { kind: 'exit' });
  }
}

export type FakeAgentCommandWithoutId = WithoutCommandId<FakeAgentCommand>;
