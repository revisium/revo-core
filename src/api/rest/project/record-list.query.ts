import type { PageDataType } from '../../../features/project/commands/utils/getOffsetPagination.js';

export function recordListQuery(first?: number, after?: string): PageDataType {
  return {
    ...(first === undefined ? {} : { first }),
    ...(after === undefined ? {} : { after }),
  };
}
