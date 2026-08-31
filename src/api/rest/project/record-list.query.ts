import type { PageDataType } from '../../../features/project/commands/utils/getOffsetPagination.js';

export function recordListQuery(first?: string, after?: string): PageDataType {
  return {
    ...(first === undefined ? {} : { first: Number(first) }),
    ...(after === undefined ? {} : { after }),
  };
}
