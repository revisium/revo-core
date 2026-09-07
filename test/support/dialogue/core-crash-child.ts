import { startDialogueScenario, type DialogueScenario } from './dialogue-scenario.js';
import type { FakeAgentExecution } from './fake-agent-control.js';

/* oxlint-disable no-await-in-loop -- Crash barriers poll committed state in sequence. */

type CrashMode = 'admitted' | 'completed' | 'midstream' | 'saved';

interface ChildCommand {
  readonly type: 'prepare' | 'shutdown';
  readonly mode?: CrashMode;
}

const send = (message: unknown): void => {
  if (process.send === undefined) {
    throw new Error('Core crash fixture requires an IPC channel.');
  }
  process.send(message);
};

let scenario: DialogueScenario | undefined;

const prepare = async (mode: CrashMode): Promise<void> => {
  scenario = await startDialogueScenario();
  if (mode === 'admitted') {
    scenario.agent.pauseTurns();
  }
  const dispatchBarrier = mode === 'saved' ? scenario.dispatch.holdNextDispatch() : undefined;
  const dialogue = await scenario.client.createDialogue({ title: `Crash ${mode}` });
  const turn = await scenario.client.send(dialogue.id, `Crash ${mode} prompt`);
  let execution: FakeAgentExecution | undefined;
  if (mode === 'saved') {
    await dispatchBarrier?.reached;
  } else if (mode === 'admitted') {
    await scenario.agent.processPid(turn);
    const deadline = Date.now() + 5_000;
    while (true) {
      const stored = await scenario.prisma.dialogueTurn.findUniqueOrThrow({
        where: { id: turn.id },
      });
      if (stored.dispatchState === 'ADMITTED' && stored.status === 'RUNNING') {
        break;
      }
      if (Date.now() >= deadline) {
        throw new Error('Turn admission was not durably observed.');
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
  } else {
    execution = await scenario.agent.expectTurn(turn);
  }
  if (mode === 'midstream' && execution !== undefined) {
    await execution.text('Committed crash prefix');
    const deadline = Date.now() + 5_000;
    let committed = false;
    while (Date.now() < deadline) {
      const history = await scenario.client.history(dialogue.id);
      if (history.some(({ text }) => text === 'Committed crash prefix')) {
        committed = true;
        break;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
    if (!committed) {
      throw new Error('Crash prefix was not durably observed.');
    }
  }
  if (mode === 'completed' && execution !== undefined) {
    await execution.text('Completed before restart');
    await execution.complete();
    const deadline = Date.now() + 5_000;
    while ((await scenario.client.dialogue(dialogue.id)).status !== 'READY') {
      if (Date.now() >= deadline) {
        throw new Error('Completed dialogue did not become ready.');
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
  }
  const history = await scenario.prisma.dialogueHistoryItem.findMany({
    where: { dialogueId: dialogue.id },
    orderBy: { sequence: 'asc' },
  });
  const runtime = await scenario.prisma.dialogueTurn.findUniqueOrThrow({ where: { id: turn.id } });
  const stream =
    runtime.runtimeSessionId === null
      ? null
      : await scenario.prisma.agentSessionEventStream.findUniqueOrThrow({
          where: { sessionId: runtime.runtimeSessionId },
        });
  const rawEvents =
    runtime.runtimeSessionId === null
      ? []
      : await scenario.prisma.agentSessionEvent.findMany({
          where: { sessionId: runtime.runtimeSessionId },
          orderBy: { sequence: 'asc' },
          select: { eventId: true, sequence: true, streamId: true, type: true, payload: true },
        });
  send({
    type: 'prepared',
    mode,
    dialogueId: dialogue.id,
    turnId: turn.id,
    fakePid: runtime.runtimeSessionId === null ? null : await scenario.agent.processPid(turn),
    cursor: (await scenario.client.historyPage(dialogue.id)).snapshotCursor,
    runtimeSessionId: runtime.runtimeSessionId,
    eventSequence: stream?.sequence ?? 0,
    rawEvents,
    history: history.map(({ id, sequence, kind, source, text, payload }) => ({
      id,
      sequence: String(sequence),
      kind,
      source,
      text,
      payload,
    })),
  });
};

const handle = async (command: ChildCommand): Promise<void> => {
  if (command.type === 'shutdown') {
    await scenario?.close();
    process.exit(0);
  }
  if (command.type !== 'prepare' || command.mode === undefined) {
    throw new Error('Invalid Core crash fixture command.');
  }
  await prepare(command.mode);
};

process.on('message', (message: unknown) => {
  void handle(message as ChildCommand).catch((error: unknown) => {
    send({ type: 'error', message: error instanceof Error ? error.stack : String(error) });
  });
});

send({ type: 'ready' });
