export function listData(data: { first: number; after?: string }): {
  first: number;
  after?: string;
} {
  if (data.after === undefined) {
    return { first: data.first };
  }

  return { first: data.first, after: data.after };
}
