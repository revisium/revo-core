import type {
  DialoguePage,
  DialoguePageInput,
} from '../../features/dialogues/management/contracts/dialogue.contracts.js';
import { pageSize } from '../../features/shared/pagination/page-size.js';
import { decodeDialogueCursor, encodeDialogueCursor } from './dialogue-persistence.js';

export interface DialoguePageContext {
  readonly first: number;
  readonly after: boolean;
  readonly upper: bigint;
  readonly snapshot: bigint;
  readonly observed: bigint;
}

export const dialoguePageContext = (
  input: DialoguePageInput,
  kind: string,
  currentUpper: bigint,
  currentSnapshot: bigint,
  currentObserved = 0n,
): DialoguePageContext => {
  const first = pageSize(input.first);

  if (input.after === undefined) {
    return {
      first,
      after: false,
      upper: currentUpper,
      snapshot: currentSnapshot,
      observed: currentObserved,
    };
  }
  const cursor = decodeDialogueCursor(input.after, kind);

  return {
    first,
    after: true,
    upper: BigInt(cursor.upper),
    snapshot: BigInt(cursor.snapshot),
    observed: cursor.observed === '' ? 0n : BigInt(cursor.observed),
  };
};

export const dialoguePage = <T>(
  nodes: readonly T[],
  positions: readonly bigint[],
  totalCount: number,
  kind: string,
  context: DialoguePageContext,
): DialoguePage<T> => {
  const hasNextPage = nodes.length > context.first;
  const selected = nodes.slice(0, context.first);
  const edges = selected.map((node, index) => ({
    node,
    cursor: encodeDialogueCursor(
      kind,
      String(positions[index] ?? 0n),
      String(context.upper),
      String(context.snapshot),
      kind.startsWith('history:') ? String(context.observed) : '',
    ),
  }));
  const startCursor = edges[0]?.cursor;
  const endCursor = edges.at(-1)?.cursor;

  return {
    edges,
    totalCount,
    pageInfo: {
      ...(startCursor === undefined ? {} : { startCursor }),
      ...(endCursor === undefined ? {} : { endCursor }),
      hasNextPage,
      hasPreviousPage: context.after,
    },
    snapshotCursor: encodeDialogueCursor('changes', String(context.snapshot)),
  };
};
