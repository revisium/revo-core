import type { LoggerService } from '@nestjs/common';

const MAX_CAUSE_DEPTH = 4;
const MAX_AGGREGATE_ERRORS = 4;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STACK_LENGTH = 8_000;

export type ErrorDiagnosticContext = Readonly<{
  operation: string;
  agentId?: string;
  agentVersion?: string;
  dialogueId?: string;
  turnId?: string;
  runId?: string;
  runtimeCode?: string;
  phase?: string;
  retryable?: boolean;
}>;

type ErrorDiagnostic = Readonly<{
  type: 'error' | 'thrown' | 'circular' | 'truncated';
  name?: string;
  message?: string;
  stack?: string;
  cause?: ErrorDiagnostic;
  errors?: readonly ErrorDiagnostic[];
  omittedErrors?: number;
  value?: string;
}>;

export function reportErrorDiagnostic(
  logger: Pick<LoggerService, 'error'>,
  context: ErrorDiagnosticContext,
  error: unknown,
): void {
  logger.error({
    message: 'Library operation failed.',
    ...sanitizeContext(context),
    error: formatErrorDiagnostic(error),
  });
}

export function formatErrorDiagnostic(error: unknown): ErrorDiagnostic {
  return formatDiagnosticValue(error, 0, new WeakSet<object>());
}

function formatDiagnosticValue(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): ErrorDiagnostic {
  if (depth > MAX_CAUSE_DEPTH) {
    return { type: 'truncated' };
  }

  if (typeof value !== 'object' || value === null) {
    return { type: 'thrown', value: sanitizeText(String(value), MAX_MESSAGE_LENGTH) };
  }

  if (seen.has(value)) {
    return { type: 'circular' };
  }
  seen.add(value);

  const name = stringProperty(value, 'name');
  const message = stringProperty(value, 'message');
  const stack = stringProperty(value, 'stack');
  const cause = property(value, 'cause');
  const aggregate = property(value, 'errors');
  const errors = Array.isArray(aggregate)
    ? aggregate
        .slice(0, MAX_AGGREGATE_ERRORS)
        .map((entry) => formatDiagnosticValue(entry, depth + 1, seen))
    : undefined;

  return {
    type: 'error',
    ...(name === undefined ? {} : { name: sanitizeText(name, MAX_MESSAGE_LENGTH) }),
    ...(message === undefined ? {} : { message: sanitizeText(message, MAX_MESSAGE_LENGTH) }),
    ...(stack === undefined ? {} : { stack: sanitizeText(stack, MAX_STACK_LENGTH) }),
    ...(cause === undefined ? {} : { cause: formatDiagnosticValue(cause, depth + 1, seen) }),
    ...(errors === undefined ? {} : { errors }),
    ...(Array.isArray(aggregate) && aggregate.length > MAX_AGGREGATE_ERRORS
      ? { omittedErrors: aggregate.length - MAX_AGGREGATE_ERRORS }
      : {}),
  };
}

function sanitizeContext(context: ErrorDiagnosticContext): ErrorDiagnosticContext {
  return {
    operation: sanitizeText(context.operation, MAX_MESSAGE_LENGTH),
    ...(context.agentId === undefined
      ? {}
      : { agentId: sanitizeText(context.agentId, MAX_MESSAGE_LENGTH) }),
    ...(context.agentVersion === undefined
      ? {}
      : { agentVersion: sanitizeText(context.agentVersion, MAX_MESSAGE_LENGTH) }),
    ...(context.dialogueId === undefined
      ? {}
      : { dialogueId: sanitizeText(context.dialogueId, MAX_MESSAGE_LENGTH) }),
    ...(context.turnId === undefined
      ? {}
      : { turnId: sanitizeText(context.turnId, MAX_MESSAGE_LENGTH) }),
    ...(context.runId === undefined
      ? {}
      : { runId: sanitizeText(context.runId, MAX_MESSAGE_LENGTH) }),
    ...(context.runtimeCode === undefined
      ? {}
      : { runtimeCode: sanitizeText(context.runtimeCode, MAX_MESSAGE_LENGTH) }),
    ...(context.phase === undefined
      ? {}
      : { phase: sanitizeText(context.phase, MAX_MESSAGE_LENGTH) }),
    ...(context.retryable === undefined ? {} : { retryable: context.retryable }),
  };
}

function property(value: object, key: string): unknown {
  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
}

function stringProperty(value: object, key: string): string | undefined {
  const candidate = property(value, key);

  return typeof candidate === 'string' ? candidate : undefined;
}

function sanitizeText(value: string, maximumLength: number): string {
  const redacted = value
    .replace(
      /-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:[A-Z0-9]+ )?PRIVATE KEY-----|$)/giu,
      '[REDACTED PRIVATE KEY]',
    )
    .replace(/\b(Bearer|Basic)\s+[a-z0-9._~+/=-]+/giu, '$1 [REDACTED]')
    .replace(/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/giu, '$1[REDACTED]@')
    .replace(
      /"([a-z][a-z0-9._-]*)"(\s*:\s*)("(?:\\.|[^"\\])*")/gimu,
      (match: string, key: string, separator: string, assignmentValue: string) =>
        isSensitiveAssignmentKey(key)
          ? `"${key}"${separator}${redactedAssignmentValue(assignmentValue)}`
          : match,
    )
    .replace(
      /'([a-z][a-z0-9._-]*)'(\s*:\s*)('(?:\\.|[^'\\])*')/gimu,
      (match: string, key: string, separator: string, assignmentValue: string) =>
        isSensitiveAssignmentKey(key)
          ? `'${key}'${separator}${redactedAssignmentValue(assignmentValue)}`
          : match,
    )
    .replace(
      /\b([a-z][a-z0-9._-]*)(\s*[:=]\s*)("(?:\\.|[^"\\])*")/gimu,
      redactUnquotedKeyAssignment,
    )
    .replace(
      /\b([a-z][a-z0-9._-]*)(\s*[:=]\s*)('(?:\\.|[^'\\])*')/gimu,
      redactUnquotedKeyAssignment,
    )
    .replace(
      /\b([a-z][a-z0-9._-]*)(\s*[:=]\s*)([^"'\s,;}\]][^\s,;}\]]*)/gimu,
      redactUnquotedKeyAssignment,
    );

  if (redacted.length <= maximumLength) {
    return redacted;
  }

  return `${redacted.slice(0, maximumLength)}[TRUNCATED]`;
}

function redactUnquotedKeyAssignment(
  match: string,
  key: string,
  separator: string,
  assignmentValue: string,
): string {
  return isSensitiveAssignmentKey(key)
    ? `${key}${separator}${redactedAssignmentValue(assignmentValue)}`
    : match;
}

function redactedAssignmentValue(value: string): string {
  const quote = value[0];

  return quote === '"' || quote === "'" ? `${quote}[REDACTED]${quote}` : '[REDACTED]';
}

function isSensitiveAssignmentKey(key: string): boolean {
  const segments = key.toLowerCase().split(/[._-]+/u);
  const joined = segments.join('');

  return (
    segments.some((segment) =>
      ['authorization', 'cookie', 'password', 'passwd', 'secret', 'token'].includes(segment),
    ) ||
    [
      'apikey',
      'accesskey',
      'privatekey',
      'clientsecret',
      'accesstoken',
      'refreshtoken',
      'proxyauthorization',
      'setcookie',
    ].some((suffix) => joined.endsWith(suffix))
  );
}
