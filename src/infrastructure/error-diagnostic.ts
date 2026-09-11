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
  model?: string;
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
  fault?: ErrorDiagnostic;
  omittedErrors?: number;
  value?: string;
  diagnostic?: {
    readonly stderr?: string;
    readonly stderrTruncated?: boolean;
    readonly provider?: {
      readonly code?: string | number;
      readonly name?: string;
      readonly message?: string;
      readonly data?: {
        readonly code?: string | number;
        readonly message?: string;
        readonly reason?: string;
        readonly error?: {
          readonly code?: string | number;
          readonly message?: string;
        };
      };
    };
  };
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

export function sanitizeErrorText(value: string, maximumLength = MAX_MESSAGE_LENGTH): string {
  return sanitizeText(value, maximumLength);
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
  const fault = property(value, 'fault');
  const aggregate = property(value, 'errors');
  const details = property(value, 'details');
  const diagnostic = formatRuntimeDiagnostic(details);
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
    ...(fault === undefined ? {} : { fault: formatDiagnosticValue(fault, depth + 1, seen) }),
    ...(errors === undefined ? {} : { errors }),
    ...(diagnostic === undefined ? {} : { diagnostic }),
    ...(Array.isArray(aggregate) && aggregate.length > MAX_AGGREGATE_ERRORS
      ? { omittedErrors: aggregate.length - MAX_AGGREGATE_ERRORS }
      : {}),
  };
}

type RuntimeDiagnostic = NonNullable<ErrorDiagnostic['diagnostic']>;

function formatRuntimeDiagnostic(value: unknown): RuntimeDiagnostic | undefined {
  const diagnostic =
    value !== null && typeof value === 'object' ? property(value, 'diagnostic') : undefined;
  const provider =
    diagnostic !== null && typeof diagnostic === 'object'
      ? property(diagnostic, 'provider')
      : undefined;
  const providerDiagnostic = formatProviderDiagnostic(provider);
  const stderr =
    diagnostic !== null && typeof diagnostic === 'object'
      ? stringProperty(diagnostic, 'stderr')
      : undefined;
  const stderrTruncated =
    diagnostic !== null && typeof diagnostic === 'object'
      ? property(diagnostic, 'stderrTruncated')
      : undefined;
  if (
    providerDiagnostic === undefined &&
    stderr === undefined &&
    typeof stderrTruncated !== 'boolean'
  ) {
    return undefined;
  }
  return {
    ...(providerDiagnostic === undefined ? {} : { provider: providerDiagnostic }),
    ...(stderr === undefined ? {} : { stderr: sanitizeText(stderr, MAX_STACK_LENGTH) }),
    ...(typeof stderrTruncated !== 'boolean' ? {} : { stderrTruncated }),
  };
}

function formatProviderDiagnostic(
  value: unknown,
): NonNullable<RuntimeDiagnostic['provider']> | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const providerCode = scalarProperty(value, 'code');
  const providerName = stringProperty(value, 'name');
  const providerMessage = stringProperty(value, 'message');
  const data = property(value, 'data');
  const providerData = formatProviderData(data);
  if (
    providerCode === undefined &&
    providerName === undefined &&
    providerMessage === undefined &&
    providerData === undefined
  ) {
    return undefined;
  }
  return {
    ...(providerCode === undefined ? {} : { code: providerCode }),
    ...(providerName === undefined ? {} : { name: sanitizeText(providerName, MAX_MESSAGE_LENGTH) }),
    ...(providerMessage === undefined
      ? {}
      : { message: sanitizeText(providerMessage, MAX_MESSAGE_LENGTH) }),
    ...(providerData === undefined ? {} : { data: providerData }),
  };
}

function formatProviderData(
  value: unknown,
): NonNullable<NonNullable<RuntimeDiagnostic['provider']>['data']> | undefined {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  const code = scalarProperty(value, 'code');
  const message = stringProperty(value, 'message');
  const reason = stringProperty(value, 'reason');
  const error = property(value, 'error');
  const errorCode =
    error !== null && typeof error === 'object' ? scalarProperty(error, 'code') : undefined;
  const errorMessage =
    error !== null && typeof error === 'object' ? stringProperty(error, 'message') : undefined;
  if (
    code === undefined &&
    message === undefined &&
    reason === undefined &&
    errorCode === undefined &&
    errorMessage === undefined
  ) {
    return undefined;
  }
  return {
    ...(code === undefined ? {} : { code }),
    ...(message === undefined ? {} : { message: sanitizeText(message, MAX_MESSAGE_LENGTH) }),
    ...(reason === undefined ? {} : { reason: sanitizeText(reason, MAX_MESSAGE_LENGTH) }),
    ...(errorCode === undefined && errorMessage === undefined
      ? {}
      : {
          error: {
            ...(errorCode === undefined ? {} : { code: errorCode }),
            ...(errorMessage === undefined
              ? {}
              : { message: sanitizeText(errorMessage, MAX_MESSAGE_LENGTH) }),
          },
        }),
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
    ...(context.model === undefined
      ? {}
      : { model: sanitizeText(context.model, MAX_MESSAGE_LENGTH) }),
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

function scalarProperty(value: object, key: string): string | number | undefined {
  const candidate = property(value, key);

  if (typeof candidate === 'string') {
    return sanitizeText(candidate, MAX_MESSAGE_LENGTH);
  }
  return typeof candidate === 'number' ? candidate : undefined;
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
