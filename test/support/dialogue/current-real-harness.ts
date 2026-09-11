import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AgentDefinitionInput } from '@revisium/revo-agent-runtime';

import { AppModule } from '../../../src/app.module.js';
import { agentRuntimeConfig } from '../../../src/config/agent-runtime.config.js';
import { AgentConfigurationWarmup } from '../../../src/features/agent-definitions/configurations/agent-configuration-warmup.js';
import { AGENT_DEFINITIONS } from '../../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { DialogueScenarioClient } from './dialogue-scenario.js';

/* oxlint-disable no-await-in-loop -- Real harness observations follow turn and SSE order. */

const terminalTurnStatuses = new Set([
  'CANCELLED',
  'COMPLETED',
  'FAILED',
  'INTERRUPTED',
  'UNCERTAIN',
]);

const cursorSequence = (cursor: string): bigint => {
  const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as {
    readonly value?: unknown;
  };
  if (typeof decoded.value !== 'string') {
    throw new Error('Real harness change cursor has no sequence.');
  }
  return BigInt(decoded.value);
};

const workspace = await mkdtemp(join(tmpdir(), 'revo-dialogue-real-harness-'));
let app: INestApplication | undefined;

try {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(AgentConfigurationWarmup)
    .useValue({})
    .overrideProvider(agentRuntimeConfig.KEY)
    .useValue({
      workspaceDirectory: workspace,
      inheritedEnvironmentNames: ['HOME', 'PATH', 'ANTHROPIC_MODEL'],
    })
    .compile();
  app = module.createNestApplication();
  await app.listen(0, '127.0.0.1');
  const definitions = app.get<readonly AgentDefinitionInput[]>(AGENT_DEFINITIONS);
  const agent = definitions.find(({ id }) => id === 'claude-acp');
  if (agent === undefined) {
    throw new Error('The discovered Claude ACP harness is unavailable.');
  }
  const client = new DialogueScenarioClient(
    app,
    new URL('/graphql', await app.getUrl()).toString(),
  );
  const prisma = app.get(PrismaService);
  const dialogue = await client.createDialogue({
    title: 'Current real harness smoke',
    agentId: agent.id,
    agentVersion: agent.version,
    agentConfiguration: { selections: { model: 'sonnet' } },
  });

  const waitForTurn = async (dialogueId: string, turnId: string): Promise<string> => {
    const deadline = Date.now() + 120_000;
    let status = 'QUEUED';
    while (!terminalTurnStatuses.has(status)) {
      if (Date.now() >= deadline) {
        throw new Error(`Real harness turn ${turnId} did not finish.`);
      }
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, 500));
      const page = await client.turnsPage(dialogueId, 100);
      const current = page.edges.find(({ node }) => node.id === turnId)?.node;
      if (current !== undefined) {
        status = current.status;
      }
    }
    return status;
  };

  const runTurn = async (dialogueId: string, prompt: string) => {
    const initial = await client.historyPage(dialogueId);
    const streamOpening = client.subscribe(dialogueId, initial.snapshotCursor);
    const turn = await client.send(dialogueId, prompt);
    const status = await waitForTurn(dialogueId, turn.id);
    const finalChange = await prisma.dialogueChange.findFirstOrThrow({
      where: { dialogueId },
      orderBy: { sequence: 'desc' },
    });
    const stream = await streamOpening;
    const changes = [];
    let sequence = cursorSequence(initial.snapshotCursor);
    while (sequence < finalChange.sequence) {
      const change = await stream.next();
      changes.push(change);
      sequence = cursorSequence(change.cursor);
    }
    await stream.close();
    const history = await client.history(dialogueId);
    const answer = history
      .filter((item) => item.turnId === turn.id && item.source === 'AGENT')
      .map(({ text }) => text)
      .join('');
    return { answer, changes, history, status, turn };
  };

  const first = await runTurn(
    dialogue.id,
    'Remember marker REAL_HARNESS_OK. Reply with exactly REAL_HARNESS_OK. Do not use tools.',
  );
  if (first.status !== 'COMPLETED' || !first.answer.includes('REAL_HARNESS_OK')) {
    throw new Error(
      `Real harness first turn failed: ${first.status} ${JSON.stringify(first.answer)}.`,
    );
  }
  const second = await runTurn(
    dialogue.id,
    'Reply with only the marker from the previous message. Do not use tools.',
  );
  if (second.status !== 'COMPLETED' || !second.answer.includes('REAL_HARNESS_OK')) {
    throw new Error(
      `Real harness continuation failed: ${second.status} ${JSON.stringify(second.answer)}.`,
    );
  }

  const forked = await client.fork(dialogue.id, second.turn.id, 'Current real harness fork');
  const forkTurn = await runTurn(
    forked.id,
    'Reply with only the marker established before this fork. Do not use tools.',
  );
  if (forkTurn.status !== 'COMPLETED' || !forkTurn.answer.includes('REAL_HARNESS_OK')) {
    throw new Error(
      `Real harness fork context failed: ${forkTurn.status} ${JSON.stringify(forkTurn.answer)}.`,
    );
  }
  const originalAfterFork = await client.history(dialogue.id);
  if (originalAfterFork.some(({ turnId }) => turnId === forkTurn.turn.id)) {
    throw new Error('Fork execution leaked into the origin dialogue history.');
  }

  const cancellationDialogue = await client.createDialogue({
    title: 'Current real harness cancellation',
    agentId: agent.id,
    agentVersion: agent.version,
    agentConfiguration: { selections: { model: 'sonnet' } },
  });
  const cancellationTurn = await client.send(
    cancellationDialogue.id,
    'Write 1000 numbered lines, one short English sentence per line. Do not use tools.',
  );
  const cancellationDeadline = Date.now() + 30_000;
  let cancellationPrefix = '';
  let observedCancellationStatus = cancellationTurn.status;
  while (
    cancellationPrefix.length === 0 &&
    !terminalTurnStatuses.has(observedCancellationStatus) &&
    Date.now() < cancellationDeadline
  ) {
    const history = await client.history(cancellationDialogue.id);
    cancellationPrefix =
      history.find(
        ({ source, turnId, text }) =>
          source === 'AGENT' && turnId === cancellationTurn.id && text.length > 0,
      )?.text ?? '';
    const page = await client.turnsPage(cancellationDialogue.id, 100);
    observedCancellationStatus =
      page.edges.find(({ node }) => node.id === cancellationTurn.id)?.node.status ??
      observedCancellationStatus;
    if (cancellationPrefix.length === 0) {
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, 25));
    }
  }
  if (!terminalTurnStatuses.has(observedCancellationStatus)) {
    await client.cancel(cancellationDialogue.id, cancellationTurn.id);
  }
  const cancellationStatus = terminalTurnStatuses.has(observedCancellationStatus)
    ? observedCancellationStatus
    : await waitForTurn(cancellationDialogue.id, cancellationTurn.id);
  const cancellationHistory = await client.history(cancellationDialogue.id);
  const cancellationItem = cancellationHistory.find(
    ({ source, turnId }) => source === 'AGENT' && turnId === cancellationTurn.id,
  );
  if (!['CANCELLED', 'INTERRUPTED'].includes(cancellationStatus)) {
    throw new Error(
      `Real harness cancellation failed: ${cancellationStatus} ${JSON.stringify(cancellationItem)}.`,
    );
  }
  if (
    cancellationItem !== undefined &&
    cancellationItem.text.length > 0 &&
    cancellationItem.status !== 'PARTIAL'
  ) {
    throw new Error(`Real harness partial cancellation item is ${cancellationItem.status}.`);
  }

  const evidence = {
    agent: { id: agent.id, version: agent.version },
    dialogueId: dialogue.id,
    first: {
      turnId: first.turn.id,
      status: first.status,
      answer: first.answer,
      changes: first.changes,
    },
    second: {
      turnId: second.turn.id,
      status: second.status,
      answer: second.answer,
      changes: second.changes,
    },
    fork: {
      dialogueId: forked.id,
      originDialogueId: forked.originDialogueId,
      originTurnId: forked.originTurnId,
      turnId: forkTurn.turn.id,
      status: forkTurn.status,
      answer: forkTurn.answer,
      originIndependent: true,
      changes: forkTurn.changes,
    },
    cancellation: {
      dialogueId: cancellationDialogue.id,
      turnId: cancellationTurn.id,
      status: cancellationStatus,
      partialOutputReproduced:
        cancellationItem !== undefined &&
        cancellationItem.text.length > 0 &&
        cancellationItem.status === 'PARTIAL',
      prefixBytes: Buffer.byteLength(cancellationItem?.text ?? '', 'utf8'),
      itemStatus: cancellationItem?.status ?? null,
      limitation:
        cancellationItem === undefined || cancellationItem.text.length === 0
          ? 'The provider emitted no text within the observation window; cancellation itself reached a durable terminal outcome.'
          : null,
    },
    interaction: {
      state: 'not_reproduced',
      reason:
        'The smoke uses no side-effecting tool prompt; deterministic ACP permission and input coverage is provided by the fake process.',
    },
  };
  const runDirectory = '/home/anton/projects/revisium/.agents/runs/persistent-dialogues-20260906';
  await mkdir(resolve('.poc/manual/evidence'), { recursive: true });
  await Promise.all([
    writeFile(
      resolve('.poc/manual/evidence/current-real-harness.json'),
      JSON.stringify(evidence, null, 2),
    ),
    writeFile(join(runDirectory, 'current-real-harness.json'), JSON.stringify(evidence, null, 2)),
  ]);
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
} finally {
  await app?.close().catch(() => undefined);
  await rm(workspace, { recursive: true, force: true });
}
