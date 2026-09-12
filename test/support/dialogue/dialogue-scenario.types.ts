export interface DialogueChange {
  readonly cursor: string;
  readonly dialogueId: string;
  readonly kind: string;
  readonly itemId: string | null;
  readonly itemVersion: string | null;
  readonly baseItemVersion: string | null;
  readonly turnId: string | null;
  readonly textDelta: string | null;
  readonly item: DialogueHistoryItem | null;
  readonly summary: CreatedDialogue | null;
}

export interface DialogueSummaryPage {
  readonly edges: readonly { readonly cursor: string; readonly node: CreatedDialogue }[];
  readonly snapshotCursor: string;
  readonly totalCount: number;
  readonly pageInfo: { readonly endCursor?: string; readonly hasNextPage: boolean };
}

export interface DialogueTurnPage {
  readonly edges: readonly { readonly cursor: string; readonly node: DialogueTurn }[];
  readonly snapshotCursor: string;
  readonly totalCount: number;
  readonly pageInfo: { readonly endCursor?: string; readonly hasNextPage: boolean };
}

export interface DialogueInteractionPage {
  readonly edges: readonly { readonly cursor: string; readonly node: DialogueInteraction }[];
  readonly snapshotCursor: string;
  readonly totalCount: number;
  readonly pageInfo: { readonly endCursor?: string; readonly hasNextPage: boolean };
}

export interface DialogueHistoryPage {
  readonly edges: readonly { readonly cursor: string; readonly node: DialogueHistoryItem }[];
  readonly snapshotCursor: string;
  readonly observedSignificantSequence: string;
  readonly totalCount: number;
  readonly pageInfo: {
    readonly endCursor?: string;
    readonly hasNextPage: boolean;
  };
}

export interface CreateDialogueOptions {
  readonly title?: string;
  readonly agentId?: string;
  readonly agentVersion?: string;
  readonly agentInstallationId?: string;
  readonly agentConfiguration?: Record<string, unknown>;
}

export interface CreatedDialogue {
  readonly id: string;
  readonly status: string;
  readonly unreadCount: number;
  readonly lastOutcome: string | null;
  readonly pendingCount: number;
  readonly activeTurnId: string | null;
  readonly progress: string;
  readonly significantSequence: string;
  readonly readSignificantSequence: string;
  readonly runtimeSessionId: string | null;
}

export interface ForkedDialogue extends CreatedDialogue {
  readonly originDialogueId: string | null;
  readonly originTurnId: string | null;
}

export interface DialogueHistoryItem {
  readonly id: string;
  readonly kind: string;
  readonly source: string;
  readonly status: string;
  readonly text: string;
  readonly version: string;
  readonly historical: boolean;
  readonly payload: unknown;
  readonly turnId: string | null;
}

export interface CreatedTurn {
  readonly id: string;
  readonly status: string;
}

export interface DialogueTurn extends CreatedTurn {
  readonly dialogueId: string;
  readonly commandId: string;
  readonly dispatchState: string;
  readonly runtimeSessionId: string | null;
}

export interface DialogueInteraction {
  readonly id: string;
  readonly status: string;
  readonly request: { readonly kind?: string; readonly [key: string]: unknown };
  readonly response: unknown;
}
