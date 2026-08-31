import { BadRequestException } from '@nestjs/common';
import { type IPaginatedType } from '@revisium/engine';

export const PaginationError = {
  pageSizeInvalid: 'The "first" parameter must be an integer between 1 and 100.',
  cursorInvalid: 'Invalid "after" cursor: must be a non-negative integer string',
} as const;

export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 100;

export type PageDataType = { readonly first?: number; after?: string };

export type EnginePageArgs = {
  first: number;
  after?: string;
};

export function enginePageArgs(pageData: PageDataType): EnginePageArgs {
  return {
    first: readPageSize(pageData.first),
    ...(pageData.after === undefined ? {} : { after: pageData.after }),
  };
}

export type OffsetPaginationFindManyArgs = {
  take: number;
  skip: number;
};

export type FindManyType<T> = (args: OffsetPaginationFindManyArgs) => Promise<T[]>;

type CountType = () => Promise<number>;

type GetPaginationArgsType<T> = {
  pageData: PageDataType;
  findMany: FindManyType<T>;
  count: CountType;
};

export async function getOffsetPagination<T>({
  pageData,
  findMany,
  count,
}: GetPaginationArgsType<T>): Promise<IPaginatedType<T>> {
  const first = readPageSize(pageData.first);

  if (pageData.after != null) {
    if (!/^\d+$/.test(pageData.after) || !Number.isSafeInteger(Number(pageData.after))) {
      throw new BadRequestException(PaginationError.cursorInvalid);
    }
  }

  const take = first;
  const skip = pageData.after ? Number(pageData.after) : 0;

  const items = await findMany({
    take,
    skip,
  });

  const endCursor: number | undefined = items.length ? skip + items.length : undefined;
  const startCursor: number | undefined = items.length ? skip + 1 : undefined;

  const hasNextPage = endCursor
    ? await findMany({
        take: 1,
        skip: endCursor,
      }).then((result) => Boolean(result.length))
    : false;
  const hasPreviousPage = Boolean(startCursor && startCursor > 1);

  const totalCount = await count();

  return {
    edges: items.map((item, index) => ({
      cursor: ((startCursor ?? 0) + index).toString(),
      node: item,
    })),
    pageInfo: {
      hasNextPage,
      hasPreviousPage,
      ...(startCursor === undefined ? {} : { startCursor: startCursor.toString() }),
      ...(endCursor === undefined ? {} : { endCursor: endCursor.toString() }),
    },
    totalCount,
  };
}

export function readPageSize(first: number | undefined): number {
  if (first === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  if (!Number.isInteger(first) || first < 1 || first > MAX_PAGE_SIZE) {
    throw new BadRequestException(PaginationError.pageSizeInvalid);
  }

  return first;
}
