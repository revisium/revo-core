import { createHash } from 'node:crypto';

export function derivePipelineSlotId(
  pipelineId: string,
  sourcePath: string,
  slotKey: string,
): string {
  const slug = slotKey
    .toLowerCase()
    .replaceAll(/[^a-z0-9_-]+/g, '-')
    .replaceAll(/^-+|-+$/g, '')
    .slice(0, 48);
  const digest = createHash('sha1')
    .update(JSON.stringify({ pipelineId, sourcePath, slotKey }))
    .digest('hex')
    .slice(0, 12);

  return `${slug === '' ? 'slot' : slug}-${digest}`;
}
