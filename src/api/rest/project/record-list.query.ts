import type { RecordListData } from '../../../features/project/get-offset-pagination.js';

export function recordListQuery(first: number, after?: string): RecordListData {
  if (after === undefined) {
    return { first };
  }

  return { first, after };
}
