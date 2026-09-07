import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

import { FakeAgentExecution, type FakeAgentCommandWithoutId } from './fake-agent-execution.js';

export { FakeAgentExecution } from './fake-agent-execution.js';

/* oxlint-disable no-await-in-loop -- Fake protocol commands and acknowledgements are ordered. */

export type FakeAgentCommand =
  | { readonly id: string; readonly kind: 'text'; readonly text: string }
  | { readonly id: string; readonly kind: 'permission' }
  | { readonly id: string; readonly kind: 'input' }
  | {
      readonly id: string;
      readonly kind: 'tool';
      readonly toolCallId: string;
      readonly title: string;
      readonly status: 'pending' | 'in_progress' | 'completed' | 'failed';
    }
  | {
      readonly id: string;
      readonly kind: 'plan';
      readonly entries: readonly {
        readonly content: string;
        readonly priority: 'high' | 'medium' | 'low';
        readonly status: 'pending' | 'in_progress' | 'completed';
      }[];
    }
  | { readonly id: string; readonly kind: 'complete' }
  | { readonly id: string; readonly kind: 'fail' }
  | { readonly id: string; readonly kind: 'wait_for_cancellation' }
  | { readonly id: string; readonly kind: 'exit' };

interface PendingExecution {
  readonly id: string;
  readonly prompt: string;
  readonly runtimeSessionId: string;
  turnId: string | undefined;
  readonly commands: FakeAgentCommand[];
  readonly commandWaiters: (() => void)[];
}

interface CommandAcknowledgement {
  readonly executionId: string;
  readonly commandId: string;
}

const readJson = async (request: NodeJS.ReadableStream): Promise<unknown> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
};

const waitUntil = async (condition: () => boolean, message: string): Promise<void> => {
  const deadline = Date.now() + 5_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error(message);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 20));
  }
};

export class FakeAgentControl {
  private readonly token = randomUUID();
  private readonly executions: PendingExecution[] = [];
  private readonly executionWaiters: (() => void)[] = [];
  private readonly processSessions = new Map<string, string>();
  private readonly processIds = new Map<string, number>();
  private readonly acknowledgements: CommandAcknowledgement[] = [];
  private readonly configurationValues: {
    readonly id: string;
    readonly value: boolean | string;
  }[] = [];
  private readonly releasedPrompts = new Set<string>();
  private readonly promptWaiters: (() => void)[] = [];
  private server: Server | undefined;
  private addressValue: string | undefined;
  private closing = false;
  private acceptedReservation: string | undefined;
  private reservationRelease: (() => void) | undefined;
  private reservationTail = Promise.resolve();
  private promptsPaused = false;

  get address(): string {
    if (this.addressValue === undefined) {
      throw new Error('Fake agent control is not listening.');
    }
    return this.addressValue;
  }

  get authorizationToken(): string {
    return this.token;
  }

  async start(): Promise<void> {
    const handleRequest = async (
      request: IncomingMessage,
      response: ServerResponse,
    ): Promise<void> => {
      try {
        if (request.headers.authorization !== `Bearer ${this.token}`) {
          response.writeHead(401).end();
          return;
        }
        if (request.method === 'POST' && request.url === '/prompt') {
          const value = (await readJson(request)) as {
            readonly processId?: unknown;
            readonly prompt?: unknown;
          };
          if (typeof value.processId !== 'string' || typeof value.prompt !== 'string') {
            response.writeHead(400).end();
            return;
          }
          const runtimeSessionId = this.processSessions.get(value.processId);
          if (runtimeSessionId === undefined) {
            throw new Error('Fake process has no runtime session binding.');
          }
          while (
            this.promptsPaused &&
            !this.releasedPrompts.has(runtimeSessionId) &&
            !this.closing
          ) {
            await new Promise<void>((resolve) => this.promptWaiters.push(resolve));
          }
          const execution: PendingExecution = {
            id: randomUUID(),
            prompt: value.prompt,
            runtimeSessionId,
            turnId: undefined,
            commands: [],
            commandWaiters: [],
          };
          this.executions.push(execution);
          this.executionWaiters.splice(0).forEach((notify) => notify());
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ executionId: execution.id }));
          return;
        }
        if (request.method === 'POST' && request.url === '/session-new') {
          const value = (await readJson(request)) as {
            readonly processId?: unknown;
            readonly pid?: unknown;
            readonly providerSessionId?: unknown;
          };
          if (
            typeof value.processId !== 'string' ||
            typeof value.pid !== 'number' ||
            typeof value.providerSessionId !== 'string'
          ) {
            response.writeHead(400).end();
            return;
          }
          if (this.acceptedReservation === undefined) {
            throw new Error('No runtime session is waiting for a fake process.');
          }
          this.processSessions.set(value.processId, this.acceptedReservation);
          this.processIds.set(this.acceptedReservation, value.pid);
          this.acceptedReservation = undefined;
          this.reservationRelease?.();
          this.reservationRelease = undefined;
          this.executionWaiters.splice(0).forEach((notify) => notify());
          response.writeHead(204).end();
          return;
        }
        if (request.method === 'POST' && request.url === '/next-command') {
          const value = (await readJson(request)) as { readonly executionId?: unknown };
          const execution = this.execution(value.executionId);
          while (execution.commands.length === 0 && !this.closing) {
            await new Promise<void>((resolve) => execution.commandWaiters.push(resolve));
          }
          const command = execution.commands.shift() ?? {
            id: randomUUID(),
            kind: 'exit' as const,
          };
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify(command));
          return;
        }
        if (request.method === 'POST' && request.url === '/command-complete') {
          const value = (await readJson(request)) as {
            readonly executionId?: unknown;
            readonly commandId?: unknown;
          };
          if (typeof value.executionId !== 'string' || typeof value.commandId !== 'string') {
            response.writeHead(400).end();
            return;
          }
          this.acknowledgements.push({
            executionId: value.executionId,
            commandId: value.commandId,
          });
          response.writeHead(204).end();
          return;
        }
        if (request.method === 'POST' && request.url === '/configuration') {
          const value = (await readJson(request)) as {
            readonly id?: unknown;
            readonly value?: unknown;
          };
          if (
            typeof value.id !== 'string' ||
            (typeof value.value !== 'string' && typeof value.value !== 'boolean')
          ) {
            response.writeHead(400).end();
            return;
          }
          this.configurationValues.push({ id: value.id, value: value.value });
          response.writeHead(204).end();
          return;
        }
        response.writeHead(404).end();
      } catch (error) {
        response.writeHead(500).end(error instanceof Error ? error.message : String(error));
      }
    };
    const server = createServer((request, response) => {
      void handleRequest(request, response);
    });
    this.server = server;
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Invalid control address.');
    }
    this.addressValue = `http://127.0.0.1:${address.port}`;
  }

  async reserveRuntimeSession(sessionId: string): Promise<void> {
    const previous = this.reservationTail;
    const reservation = Promise.withResolvers<void>();
    this.reservationTail = reservation.promise;
    await previous;
    this.acceptedReservation = sessionId;
    this.reservationRelease = reservation.resolve;
  }

  pausePrompts(): void {
    this.promptsPaused = true;
  }

  releasePrompt(runtimeSessionId: string): void {
    this.releasedPrompts.add(runtimeSessionId);
    this.promptWaiters.splice(0).forEach((notify) => notify());
  }

  resumePrompts(): void {
    this.promptsPaused = false;
    this.promptWaiters.splice(0).forEach((notify) => notify());
  }

  releaseRuntimeSession(sessionId: string): void {
    if (this.acceptedReservation !== sessionId) {
      return;
    }
    this.acceptedReservation = undefined;
    this.reservationRelease?.();
    this.reservationRelease = undefined;
  }

  async expectTurn(
    turn: { readonly id: string },
    runtimeSessionId: string,
  ): Promise<FakeAgentExecution> {
    await waitUntil(
      () =>
        this.executions.some(
          (execution) =>
            execution.turnId === undefined && execution.runtimeSessionId === runtimeSessionId,
        ),
      `Timed out waiting for fake execution for turn ${turn.id}.`,
    );
    const execution = this.executions.find(
      (candidate) =>
        candidate.turnId === undefined && candidate.runtimeSessionId === runtimeSessionId,
    );
    if (execution === undefined) {
      throw new Error('Fake execution disappeared before assignment.');
    }
    execution.turnId = turn.id;
    return new FakeAgentExecution(execution.id, turn.id, execution.prompt, this);
  }

  async waitForExecution(runtimeSessionId: string): Promise<void> {
    await waitUntil(
      () => this.executions.some((execution) => execution.runtimeSessionId === runtimeSessionId),
      `Timed out waiting for fake prompt in runtime session ${runtimeSessionId}.`,
    );
  }

  processPid(runtimeSessionId: string): number | undefined {
    return this.processIds.get(runtimeSessionId);
  }

  get pendingExecutionCount(): number {
    return this.executions.filter(({ turnId }) => turnId === undefined).length;
  }

  async issue(executionId: string, command: FakeAgentCommandWithoutId): Promise<void> {
    const id = randomUUID();
    const execution = this.execution(executionId);
    execution.commands.push({ id, ...command });
    execution.commandWaiters.splice(0).forEach((notify) => notify());
    await waitUntil(
      () =>
        this.acknowledgements.some(
          (acknowledgement) =>
            acknowledgement.executionId === executionId && acknowledgement.commandId === id,
        ),
      `Timed out waiting for fake command ${command.kind}.`,
    );
    const acknowledgementIndex = this.acknowledgements.findIndex(
      (acknowledgement) =>
        acknowledgement.executionId === executionId && acknowledgement.commandId === id,
    );
    if (acknowledgementIndex >= 0) {
      this.acknowledgements.splice(acknowledgementIndex, 1);
    }
  }

  async waitForConfiguration(id: string): Promise<boolean | string> {
    await waitUntil(
      () => this.configurationValues.some((entry) => entry.id === id),
      `Timed out waiting for fake agent configuration ${id}.`,
    );
    const match = this.configurationValues.find((entry) => entry.id === id);
    if (match === undefined) {
      throw new Error('Fake configuration disappeared before observation.');
    }
    return match.value;
  }

  async close(): Promise<void> {
    this.closing = true;
    this.reservationRelease?.();
    this.reservationRelease = undefined;
    this.executions.forEach((execution) => {
      execution.commandWaiters.splice(0).forEach((notify) => notify());
    });
    this.executionWaiters.splice(0).forEach((notify) => notify());
    this.promptWaiters.splice(0).forEach((notify) => notify());
    if (this.server === undefined) {
      return;
    }
    const server = this.server;
    const closed = new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.race([closed, new Promise<void>((resolve) => setTimeout(resolve, 250))]);
    server.closeAllConnections();
    await Promise.race([closed, new Promise<void>((resolve) => setTimeout(resolve, 1_000))]);
  }

  private execution(value: unknown): PendingExecution {
    if (typeof value !== 'string') {
      throw new Error('Fake execution id is required.');
    }
    const execution = this.executions.find(({ id }) => id === value);
    if (execution === undefined) {
      throw new Error(`Unknown fake execution ${value}.`);
    }
    return execution;
  }
}
