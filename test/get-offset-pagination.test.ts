import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getOffsetPagination,
  type FindManyType,
  type OffsetPaginationFindManyArgs,
} from '../src/features/project/commands/utils/getOffsetPagination.js';

type TestNode = { id: string };

describe('getOffsetPagination', () => {
  const mockNodes: TestNode[] = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];

  let mockFindMany: ReturnType<typeof vi.fn<FindManyType<TestNode>>>;
  let mockCount: ReturnType<typeof vi.fn<() => Promise<number>>>;

  beforeEach(() => {
    mockCount = vi.fn<() => Promise<number>>(async () => mockNodes.length);
    mockFindMany = vi.fn<FindManyType<TestNode>>(
      async ({ take, skip }: OffsetPaginationFindManyArgs) => mockNodes.slice(skip, skip + take),
    );
  });

  test('throws when first is negative', async () => {
    await expect(
      getOffsetPagination({
        pageData: { first: -1 },
        findMany: mockFindMany,
        count: mockCount,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('throws when first is not an integer', async () => {
    await expect(
      getOffsetPagination({
        pageData: { first: 1.5 },
        findMany: mockFindMany,
        count: mockCount,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('throws when after did not come from this list', async () => {
    await expect(
      getOffsetPagination({
        pageData: { first: 10, after: 'abc' },
        findMany: mockFindMany,
        count: mockCount,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      getOffsetPagination({
        pageData: { first: 10, after: cursor(-1) },
        findMany: mockFindMany,
        count: mockCount,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      getOffsetPagination({
        pageData: { first: 10, after: Buffer.from('2').toString('base64url') },
        findMany: mockFindMany,
        count: mockCount,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('hides the cursor encoding from the caller', async () => {
    const page = await getOffsetPagination({
      pageData: { first: 2 },
      findMany: mockFindMany,
      count: mockCount,
    });

    expect(page.pageInfo.endCursor).not.toMatch(/^\d+$/);

    const next = await getOffsetPagination({
      pageData: { first: 2, after: page.pageInfo.endCursor ?? '' },
      findMany: mockFindMany,
      count: mockCount,
    });

    expect(next.edges[0]?.node).not.toEqual(page.edges[0]?.node);
  });

  test('throws when first is below the supported range', async () => {
    await expect(
      getOffsetPagination({
        pageData: { first: 0 },
        findMany: mockFindMany,
        count: mockCount,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('throws when first is above the supported range', async () => {
    await expect(
      getOffsetPagination({
        pageData: { first: 101 },
        findMany: mockFindMany,
        count: mockCount,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  test('falls back to the default page size when first is omitted', async () => {
    await getOffsetPagination({
      pageData: {},
      findMany: mockFindMany,
      count: mockCount,
    });

    expect(mockFindMany).toHaveBeenCalledWith({ take: 100, skip: 0 });
  });

  test('returns the first page without an after cursor', async () => {
    const result = await getOffsetPagination({
      pageData: { first: 2 },
      findMany: mockFindMany,
      count: mockCount,
    });

    expect(result.edges).toHaveLength(2);
    expect(result.totalCount).toBe(5);
    expect(result.pageInfo.hasNextPage).toBe(true);
    expect(result.pageInfo.hasPreviousPage).toBe(false);
    expect(result.pageInfo.startCursor).toBe(cursor(1));
    expect(result.pageInfo.endCursor).toBe(cursor(2));
  });

  test('returns the next page from an offset cursor', async () => {
    const result = await getOffsetPagination({
      pageData: { first: 2, after: cursor(2) },
      findMany: mockFindMany,
      count: mockCount,
    });

    expect(result.edges.map((edge) => edge.node.id)).toEqual(['3', '4']);
    expect(result.pageInfo.hasPreviousPage).toBe(true);
    expect(result.pageInfo.hasNextPage).toBe(true);
  });
});

function cursor(position: number): string {
  return Buffer.from(`offset:${position}`).toString('base64url');
}
