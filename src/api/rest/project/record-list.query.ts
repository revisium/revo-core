import type { PageDataType } from '../../../features/project/commands/utils/getOffsetPagination.js';

export function recordListQuery(first: number, after?: string): PageDataType {
  if (after === undefined) {
    return { first };
  }

  return { first, after };
}
