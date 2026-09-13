import type { PageDataType } from '../../../infrastructure/pagination/get-offset-pagination.js';

export function recordListQuery(first?: number, after?: string): PageDataType {
  return {
    ...(first === undefined ? {} : { first }),
    ...(after === undefined ? {} : { after }),
  };
}
