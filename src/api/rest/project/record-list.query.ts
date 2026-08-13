import type { RecordListData } from '../../../features/project/commands/utils/getOffsetPagination.js';

export function recordListQuery(first: number, after?: string): RecordListData {
  if (after === undefined) {
    return { first };
  }

  return { first, after };
}
