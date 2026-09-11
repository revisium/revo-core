import type { AgentConfigurationSelection } from '@revisium/revo-agent-runtime';

export type DialogueJson =
  | boolean
  | number
  | string
  | null
  | readonly DialogueJson[]
  | { readonly [key: string]: DialogueJson };

export enum DialogueStatus {
  READY = 'READY',
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  UNCERTAIN = 'UNCERTAIN',
  CLOSED = 'CLOSED',
}

export enum DialogueOutcome {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  INTERRUPTED = 'INTERRUPTED',
  FAILED = 'FAILED',
  UNCERTAIN = 'UNCERTAIN',
}

export enum DialogueContextMode {
  NEW = 'NEW',
  CONTINUED = 'CONTINUED',
  FORK = 'FORK',
}

export enum DialogueTurnStatus {
  QUEUED = 'QUEUED',
  RUNNING = 'RUNNING',
  WAITING = 'WAITING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  INTERRUPTED = 'INTERRUPTED',
  FAILED = 'FAILED',
  UNCERTAIN = 'UNCERTAIN',
}

export enum DialogueDispatchState {
  SAVED = 'SAVED',
  DISPATCHING = 'DISPATCHING',
  ADMITTED = 'ADMITTED',
  FINISHED = 'FINISHED',
  UNCERTAIN = 'UNCERTAIN',
}

export enum DialogueHistoryItemKind {
  MESSAGE = 'MESSAGE',
  OPERATION = 'OPERATION',
  INTERACTION = 'INTERACTION',
  RESULT = 'RESULT',
  PLAN = 'PLAN',
  USAGE = 'USAGE',
  CHECKPOINT = 'CHECKPOINT',
}

export enum DialogueHistoryItemSource {
  USER = 'USER',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM',
}

export enum DialogueHistoryItemStatus {
  STREAMING = 'STREAMING',
  COMPLETED = 'COMPLETED',
  PARTIAL = 'PARTIAL',
  STARTED = 'STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  FAILED = 'FAILED',
  INTERRUPTED = 'INTERRUPTED',
  PENDING = 'PENDING',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
  ABANDONED = 'ABANDONED',
  CANCELLED = 'CANCELLED',
}

export enum DialogueInteractionStatus {
  PENDING = 'PENDING',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED',
  ABANDONED = 'ABANDONED',
}

export enum DialogueChangeKind {
  SUMMARY_UPDATED = 'SUMMARY_UPDATED',
  HISTORY_ITEM_UPSERTED = 'HISTORY_ITEM_UPSERTED',
  HISTORY_TEXT_APPENDED = 'HISTORY_TEXT_APPENDED',
}

export interface DialoguePageInput {
  readonly first?: number;
  readonly after?: string;
}

export interface DialogueSummary {
  readonly id: string;
  readonly title: string;
  readonly agentId: string;
  readonly agentVersion: string;
  readonly agentConfiguration: AgentConfigurationSelection;
  readonly metadata: DialogueJson;
  readonly systemContext: string;
  readonly status: DialogueStatus;
  readonly progress: string;
  readonly pendingCount: number;
  readonly lastOutcome: DialogueOutcome | null;
  readonly activeTurnId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly version: string;
  readonly significantSequence: string;
  readonly readSignificantSequence: string;
  readonly unreadCount: number;
  readonly runtimeSessionId: string | null;
  readonly originDialogueId: string | null;
  readonly originTurnId: string | null;
  readonly originItemSequence: string | null;
  readonly contextMode: DialogueContextMode;
}

export interface DialogueHistoryItem {
  readonly id: string;
  readonly dialogueId: string;
  readonly sequence: string;
  readonly turnId: string | null;
  readonly kind: DialogueHistoryItemKind;
  readonly source: DialogueHistoryItemSource;
  readonly text: string;
  readonly payload: DialogueJson;
  readonly status: DialogueHistoryItemStatus;
  readonly version: string;
  readonly createdAt: Date;
  readonly historical: boolean;
}

export interface DialogueTurn {
  readonly id: string;
  readonly dialogueId: string;
  readonly commandId: string;
  readonly userItemId: string;
  readonly status: DialogueTurnStatus;
  readonly dispatchState: DialogueDispatchState;
  readonly cancelRequested: boolean;
  readonly runtimeSessionId: string | null;
  readonly outcome: DialogueJson;
  readonly createdAt: Date;
  readonly completedAt: Date | null;
  readonly endItemSequence: string | null;
}

export interface DialogueInteraction {
  readonly id: string;
  readonly dialogueId: string;
  readonly turnId: string | null;
  readonly status: DialogueInteractionStatus;
  readonly request: DialogueJson;
  readonly response: DialogueJson | null;
  readonly responseCommandId: string | null;
}

export interface DialoguePage<T> {
  readonly observedSignificantSequence?: string;
  readonly edges: readonly { readonly cursor: string; readonly node: T }[];
  readonly totalCount: number;
  readonly pageInfo: {
    readonly startCursor?: string;
    readonly endCursor?: string;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
  };
  readonly snapshotCursor: string;
}

export interface DialogueChange {
  readonly cursor: string;
  readonly dialogueId: string;
  readonly kind: DialogueChangeKind;
  readonly itemId: string | null;
  readonly itemVersion: string | null;
  readonly baseItemVersion: string | null;
  readonly itemSequence: string | null;
  readonly turnId: string | null;
  readonly itemKind: DialogueHistoryItemKind | null;
  readonly itemSource: DialogueHistoryItemSource | null;
  readonly textDelta: string | null;
  readonly item: DialogueHistoryItem | null;
  readonly summary: DialogueSummary | null;
}

export interface CreateDialogueInput {
  readonly title: string;
  readonly agentId: string;
  readonly agentVersion: string;
  readonly agentConfiguration?: DialogueJson;
  readonly systemContext?: string;
  readonly metadata?: DialogueJson;
}

export interface SendDialogueInput {
  readonly dialogueId: string;
  readonly commandId: string;
  readonly prompt: string;
}

export interface RespondDialogueInput {
  readonly dialogueId: string;
  readonly interactionId: string;
  readonly commandId: string;
  readonly response: DialogueJson;
}

export interface ForkDialogueInput {
  readonly dialogueId: string;
  readonly turnId: string;
  readonly title: string;
}
