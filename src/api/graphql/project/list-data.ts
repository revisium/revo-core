import type { PageDataType } from '../../../features/project/commands/utils/getOffsetPagination.js';

export function listData(data: { first?: number; after?: string }): PageDataType {
  return {
    ...(data.first === undefined ? {} : { first: data.first }),
    ...(data.after === undefined ? {} : { after: data.after }),
  };
}
