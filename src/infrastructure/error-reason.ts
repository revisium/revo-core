const UNKNOWN_REASON = 'unknown error';

export function errorReason(error: unknown, fallback: string = UNKNOWN_REASON): string {
  return error instanceof Error ? error.message : fallback;
}
