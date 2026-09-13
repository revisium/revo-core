import type { PageDataType } from '../../../infrastructure/pagination/get-offset-pagination.js';

export function listData(data: { first?: number; after?: string }): PageDataType {
  return {
    ...(data.first === undefined ? {} : { first: data.first }),
    ...(data.after === undefined ? {} : { after: data.after }),
  };
}
