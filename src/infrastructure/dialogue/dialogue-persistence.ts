import { BadRequestException } from '@nestjs/common';
import {
  decodeAgentConfigurationSelection,
  type AgentConfigurationSelection,
} from '@revisium/revo-agent-runtime';

import {
  DialogueChangeKind as StoredDialogueChangeKind,
  Prisma,
  type Dialogue as StoredDialogue,
  DialogueHistoryItem as StoredHistoryItem,
  DialogueInteraction as StoredInteraction,
  DialogueTurn as StoredTurn,
} from '../../__generated__/client/client.js';
import {
  DialogueContextMode,
  DialogueChangeKind,
  DialogueDispatchState,
  DialogueHistoryItemKind,
  DialogueHistoryItemSource,
  DialogueHistoryItemStatus,
  DialogueInteractionStatus,
  DialogueOutcome,
  DialogueStatus,
  DialogueTurnStatus,
} from '../../features/dialogues/management/contracts/dialogue.contracts.js';
import type {
  DialogueHistoryItem,
  DialogueInteraction,
  DialogueJson,
  DialogueSummary,
  DialogueTurn,
} from '../../features/dialogues/management/contracts/dialogue.contracts.js';

export type DialogueTransaction = Prisma.TransactionClient;

export interface DialogueCursorPosition {
  readonly value: string;
  readonly upper: string;
  readonly snapshot: string;
  readonly observed: string;
}

export function compareHistoryItemSequence(
  left: Pick<StoredHistoryItem, 'sequence'>,
  right: Pick<StoredHistoryItem, 'sequence'>,
): number {
  if (left.sequence < right.sequence) {
    return -1;
  }

  if (left.sequence > right.sequence) {
    return 1;
  }

  return 0;
}

const inputJson = (value: unknown): Prisma.InputJsonValue | null => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError('Dialogue JSON contains a non-finite number.');
    }

    return value;
  }

  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => inputJson(entry));
  }

  if (typeof value === 'object') {
    const result: Record<string, Prisma.InputJsonValue | null> = {};

    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        result[key] = inputJson(entry);
      }
    }

    return result;
  }
  throw new TypeError('Dialogue JSON contains an unsupported value.');
};

export const json = (value: unknown): Prisma.InputJsonValue | Prisma.JsonNullValueInput =>
  inputJson(value) ?? Prisma.JsonNull;

export const dialogueJson = (value: Prisma.JsonValue): DialogueJson => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(dialogueJson);
  }
  const result: Record<string, DialogueJson> = {};

  for (const [key, entry] of Object.entries(value)) {
    if (entry === undefined) {
      throw new TypeError('Stored dialogue JSON contains undefined.');
    }
    result[key] = dialogueJson(entry);
  }

  return result;
};

export const decodeDialogueAgentConfiguration = (
  value: Prisma.JsonValue,
): AgentConfigurationSelection => decodeAgentConfigurationSelection(dialogueJson(value));

const dialogueStatuses: Record<StoredDialogue['status'], DialogueStatus> = {
  READY: DialogueStatus.READY,
  QUEUED: DialogueStatus.QUEUED,
  RUNNING: DialogueStatus.RUNNING,
  WAITING: DialogueStatus.WAITING,
  UNCERTAIN: DialogueStatus.UNCERTAIN,
  CLOSED: DialogueStatus.CLOSED,
};

const dialogueOutcomes: Record<Exclude<StoredDialogue['lastOutcome'], null>, DialogueOutcome> = {
  COMPLETED: DialogueOutcome.COMPLETED,
  CANCELLED: DialogueOutcome.CANCELLED,
  INTERRUPTED: DialogueOutcome.INTERRUPTED,
  FAILED: DialogueOutcome.FAILED,
  UNCERTAIN: DialogueOutcome.UNCERTAIN,
};

const contextModes: Record<StoredDialogue['contextMode'], DialogueContextMode> = {
  NEW: DialogueContextMode.NEW,
  CONTINUED: DialogueContextMode.CONTINUED,
  FORK: DialogueContextMode.FORK,
};

const historyKinds: Record<StoredHistoryItem['kind'], DialogueHistoryItemKind> = {
  MESSAGE: DialogueHistoryItemKind.MESSAGE,
  OPERATION: DialogueHistoryItemKind.OPERATION,
  INTERACTION: DialogueHistoryItemKind.INTERACTION,
  RESULT: DialogueHistoryItemKind.RESULT,
  PLAN: DialogueHistoryItemKind.PLAN,
  USAGE: DialogueHistoryItemKind.USAGE,
  CHECKPOINT: DialogueHistoryItemKind.CHECKPOINT,
};

const historySources: Record<StoredHistoryItem['source'], DialogueHistoryItemSource> = {
  USER: DialogueHistoryItemSource.USER,
  AGENT: DialogueHistoryItemSource.AGENT,
  SYSTEM: DialogueHistoryItemSource.SYSTEM,
};

const historyStatuses: Record<StoredHistoryItem['status'], DialogueHistoryItemStatus> = {
  STREAMING: DialogueHistoryItemStatus.STREAMING,
  COMPLETED: DialogueHistoryItemStatus.COMPLETED,
  PARTIAL: DialogueHistoryItemStatus.PARTIAL,
  STARTED: DialogueHistoryItemStatus.STARTED,
  IN_PROGRESS: DialogueHistoryItemStatus.IN_PROGRESS,
  FAILED: DialogueHistoryItemStatus.FAILED,
  INTERRUPTED: DialogueHistoryItemStatus.INTERRUPTED,
  PENDING: DialogueHistoryItemStatus.PENDING,
  RESPONDING: DialogueHistoryItemStatus.RESPONDING,
  RESOLVED: DialogueHistoryItemStatus.RESOLVED,
  ABANDONED: DialogueHistoryItemStatus.ABANDONED,
  CANCELLED: DialogueHistoryItemStatus.CANCELLED,
};

const turnStatuses: Record<StoredTurn['status'], DialogueTurnStatus> = {
  QUEUED: DialogueTurnStatus.QUEUED,
  RUNNING: DialogueTurnStatus.RUNNING,
  WAITING: DialogueTurnStatus.WAITING,
  COMPLETED: DialogueTurnStatus.COMPLETED,
  CANCELLED: DialogueTurnStatus.CANCELLED,
  INTERRUPTED: DialogueTurnStatus.INTERRUPTED,
  FAILED: DialogueTurnStatus.FAILED,
  UNCERTAIN: DialogueTurnStatus.UNCERTAIN,
};

const dispatchStates: Record<StoredTurn['dispatchState'], DialogueDispatchState> = {
  SAVED: DialogueDispatchState.SAVED,
  DISPATCHING: DialogueDispatchState.DISPATCHING,
  ADMITTED: DialogueDispatchState.ADMITTED,
  FINISHED: DialogueDispatchState.FINISHED,
  UNCERTAIN: DialogueDispatchState.UNCERTAIN,
};

const interactionStatuses: Record<StoredInteraction['status'], DialogueInteractionStatus> = {
  PENDING: DialogueInteractionStatus.PENDING,
  RESPONDING: DialogueInteractionStatus.RESPONDING,
  RESOLVED: DialogueInteractionStatus.RESOLVED,
  ABANDONED: DialogueInteractionStatus.ABANDONED,
};

const changeKinds: Record<StoredDialogueChangeKind, DialogueChangeKind> = {
  SUMMARY_UPDATED: DialogueChangeKind.SUMMARY_UPDATED,
  HISTORY_ITEM_UPSERTED: DialogueChangeKind.HISTORY_ITEM_UPSERTED,
  HISTORY_TEXT_APPENDED: DialogueChangeKind.HISTORY_TEXT_APPENDED,
};

export const dialogueChangeKind = (value: keyof typeof changeKinds) => changeKinds[value];
export const dialogueHistoryKind = (value: StoredHistoryItem['kind']) => historyKinds[value];
export const dialogueHistorySource = (value: StoredHistoryItem['source']) => historySources[value];

export const encodeDialogueCursor = (
  kind: string,
  value: string,
  upper = '',
  snapshot = '',
  observed = '',
): string =>
  Buffer.from(JSON.stringify({ v: 2, kind, value, upper, snapshot, observed })).toString(
    'base64url',
  );

export const decodeDialogueCursor = (cursor: string, kind: string): DialogueCursorPosition => {
  try {
    const decoded: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString());

    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('v' in decoded) ||
      decoded.v !== 2 ||
      !('kind' in decoded) ||
      decoded.kind !== kind ||
      !('value' in decoded) ||
      typeof decoded.value !== 'string' ||
      !/^\d+$/.test(decoded.value) ||
      !('upper' in decoded) ||
      typeof decoded.upper !== 'string' ||
      !('snapshot' in decoded) ||
      typeof decoded.snapshot !== 'string' ||
      !('observed' in decoded) ||
      typeof decoded.observed !== 'string'
    ) {
      throw new TypeError('Invalid cursor.');
    }
    const isChangeCursor = kind === 'changes';
    const isHistoryCursor = kind.startsWith('history:');

    if (
      (!isChangeCursor && (!/^\d+$/.test(decoded.upper) || !/^\d+$/.test(decoded.snapshot))) ||
      (isHistoryCursor && !/^\d+$/.test(decoded.observed)) ||
      (!isHistoryCursor && decoded.observed !== '' && !/^\d+$/.test(decoded.observed)) ||
      (isChangeCursor &&
        (decoded.upper !== '' || decoded.snapshot !== '' || decoded.observed !== '')) ||
      (!isChangeCursor && BigInt(decoded.value) > BigInt(decoded.upper))
    ) {
      throw new TypeError('Invalid cursor.');
    }

    return {
      value: decoded.value,
      upper: decoded.upper,
      snapshot: decoded.snapshot,
      observed: decoded.observed,
    };
  } catch {
    throw new BadRequestException(
      'INVALID_CURSOR: reload the first page and use its snapshot cursor.',
    );
  }
};

export const dialogueSummaryView = (dialogue: StoredDialogue): DialogueSummary => {
  const agentConfiguration = decodeDialogueAgentConfiguration(dialogue.agentConfiguration);

  return {
    id: dialogue.id,
    title: dialogue.title,
    agentId: dialogue.agentId,
    agentVersion: dialogue.agentVersion,
    agentConfiguration,
    metadata: dialogueJson(dialogue.metadata),
    systemContext: dialogue.systemContext,
    status: dialogueStatuses[dialogue.status],
    progress: dialogue.progress,
    pendingCount: dialogue.pendingCount,
    lastOutcome: dialogue.lastOutcome === null ? null : dialogueOutcomes[dialogue.lastOutcome],
    activeTurnId: dialogue.activeTurnId,
    createdAt: dialogue.createdAt,
    updatedAt: dialogue.updatedAt,
    version: String(dialogue.version),
    significantSequence: String(dialogue.significantSequence),
    readSignificantSequence: String(dialogue.readSignificantSequence),
    unreadCount: Number(dialogue.significantSequence - dialogue.readSignificantSequence),
    runtimeSessionId: dialogue.runtimeSessionId,
    originDialogueId: dialogue.originDialogueId,
    originTurnId: dialogue.originTurnId,
    originItemSequence:
      dialogue.originItemSequence === null ? null : String(dialogue.originItemSequence),
    contextMode: contextModes[dialogue.contextMode],
  };
};

export const dialogueHistoryItemView = (item: StoredHistoryItem): DialogueHistoryItem => ({
  id: item.id,
  dialogueId: item.dialogueId,
  sequence: String(item.sequence),
  turnId: item.turnId,
  kind: historyKinds[item.kind],
  source: historySources[item.source],
  text: item.text,
  payload: dialogueJson(item.payload),
  status: historyStatuses[item.status],
  version: String(item.version),
  createdAt: item.createdAt,
  historical: item.historical,
});

export const dialogueTurnView = (turn: StoredTurn): DialogueTurn => ({
  id: turn.id,
  dialogueId: turn.dialogueId,
  commandId: turn.commandId,
  userItemId: turn.userItemId,
  status: turnStatuses[turn.status],
  dispatchState: dispatchStates[turn.dispatchState],
  cancelRequested: turn.cancelRequested,
  runtimeSessionId: turn.runtimeSessionId,
  outcome: dialogueJson(turn.outcome),
  createdAt: turn.createdAt,
  completedAt: turn.completedAt,
  endItemSequence: turn.endItemSequence === null ? null : String(turn.endItemSequence),
});

export const dialogueInteractionView = (interaction: StoredInteraction): DialogueInteraction => ({
  id: interaction.id,
  dialogueId: interaction.dialogueId,
  turnId: interaction.turnId,
  status: interactionStatuses[interaction.status],
  request: dialogueJson(interaction.request),
  response: interaction.response === null ? null : dialogueJson(interaction.response),
  responseCommandId: interaction.responseCommandId,
});
