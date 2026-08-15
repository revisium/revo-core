import { createHash } from 'node:crypto';

export function derivePipelineSlotId(
  pipelineId: string,
  sourcePath: string,
  slotKey: string,
): string {
  const slug = slugSlotKey(slotKey).slice(0, 48);
  const digest = createHash('sha1')
    .update(JSON.stringify({ pipelineId, sourcePath, slotKey }))
    .digest('hex')
    .slice(0, 12);

  return `${slug === '' ? 'slot' : slug}-${digest}`;
}

function slugSlotKey(slotKey: string): string {
  let slug = '';
  let pendingDash = false;

  for (const character of slotKey.toLowerCase()) {
    if (isSlugCharacter(character)) {
      if (pendingDash && slug !== '') {
        slug += '-';
      }

      slug += character;
      pendingDash = false;
      continue;
    }

    pendingDash = true;
  }

  while (slug.startsWith('-')) {
    slug = slug.slice(1);
  }

  while (slug.endsWith('-')) {
    slug = slug.slice(0, -1);
  }

  return slug;
}

function isSlugCharacter(character: string): boolean {
  return (
    (character >= 'a' && character <= 'z') ||
    (character >= '0' && character <= '9') ||
    character === '_' ||
    character === '-'
  );
}
