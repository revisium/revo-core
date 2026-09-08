import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import type { CreatedTurn } from './dialogue-scenario.types.js';
import { FakeAgentControl } from './fake-agent-control.js';
import type { FakeAgentExecution } from './fake-agent-execution.js';

/* oxlint-disable no-await-in-loop -- Runtime bindings are observed at deterministic barriers. */

export class DialogueScenarioAgent {
  constructor(
    private readonly control: FakeAgentControl,
    private readonly prisma: PrismaService,
  ) {}

  async expectTurn(turn: CreatedTurn): Promise<FakeAgentExecution> {
    const runtimeSessionId = await this.runtimeSessionId(turn);
    return this.control.expectTurn(turn, runtimeSessionId);
  }

  pauseTurns(): void {
    this.control.pausePrompts();
  }

  async releaseTurn(turn: CreatedTurn): Promise<void> {
    this.control.releasePrompt(await this.runtimeSessionId(turn));
  }

  async waitForPrompt(turn: CreatedTurn): Promise<void> {
    await this.control.waitForExecution(await this.runtimeSessionId(turn));
  }

  async processPid(turn: CreatedTurn): Promise<number> {
    const runtimeSessionId = await this.runtimeSessionId(turn);
    const deadline = Date.now() + 5_000;
    let pid = this.control.processPid(runtimeSessionId);
    while (pid === undefined && Date.now() < deadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
      pid = this.control.processPid(runtimeSessionId);
    }
    if (pid === undefined) {
      throw new Error(`Turn ${turn.id} has no fake process.`);
    }
    return pid;
  }

  async killProvider(turn: CreatedTurn): Promise<void> {
    process.kill(await this.processPid(turn), 'SIGKILL');
  }

  resumeTurns(): void {
    this.control.resumePrompts();
  }

  waitForConfiguration(id: string): Promise<boolean | string> {
    return this.control.waitForConfiguration(id);
  }

  get pendingExecutionCount(): number {
    return this.control.pendingExecutionCount;
  }

  private async runtimeSessionId(turn: CreatedTurn): Promise<string> {
    let runtimeSessionId: string | null | undefined;
    const deadline = Date.now() + 5_000;
    while (runtimeSessionId === undefined || runtimeSessionId === null) {
      const stored = await this.prisma.dialogueTurn.findUnique({ where: { id: turn.id } });
      runtimeSessionId = stored?.runtimeSessionId;
      if (runtimeSessionId !== undefined && runtimeSessionId !== null) {
        break;
      }
      if (Date.now() >= deadline) {
        break;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
    if (runtimeSessionId === undefined || runtimeSessionId === null) {
      throw new Error(`Turn ${turn.id} has no runtime session binding.`);
    }
    return runtimeSessionId;
  }
}
