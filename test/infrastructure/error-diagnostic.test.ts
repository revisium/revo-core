import type { LoggerService } from '@nestjs/common';
import { describe, expect, test, vi } from 'vitest';

import {
  formatErrorDiagnostic,
  reportErrorDiagnostic,
} from '../../src/infrastructure/error-diagnostic.js';

describe('error diagnostics', () => {
  test('keeps the available cause and stack while redacting credentials', () => {
    const cause = new Error(
      'provider failed with Bearer private-token at https://user:password@example.test/path',
    );
    cause.stack = 'provider stack api_key=private-key';
    const error = new Error('outer failure password=private-password', { cause });
    error.stack = 'outer stack\n-----BEGIN PRIVATE KEY-----\nprivate\n-----END PRIVATE KEY-----';

    const diagnostic = formatErrorDiagnostic(error);
    const serialized = JSON.stringify(diagnostic);

    expect(diagnostic).toMatchObject({
      type: 'error',
      name: 'Error',
      message: 'outer failure password=[REDACTED]',
      stack: 'outer stack\n[REDACTED PRIVATE KEY]',
      cause: {
        type: 'error',
        name: 'Error',
        message: 'provider failed with Bearer [REDACTED] at https://[REDACTED]@example.test/path',
        stack: 'provider stack api_key=[REDACTED]',
      },
    });
    expect(serialized).not.toContain('private-token');
    expect(serialized).not.toContain('private-password');
    expect(serialized).not.toContain('private-key');
  });

  test('redacts prefixed and underscore secret assignments while keeping their labels', () => {
    const error = new Error(
      'provider rejected OPENAI_API_KEY=sk-private AWS_SECRET_ACCESS_KEY=aws-private',
    );
    error.stack =
      'provider stack access_token=oauth-private client_secret="client-private" request_id=req-safe';

    const diagnostic = formatErrorDiagnostic(error);

    expect(diagnostic).toMatchObject({
      message: 'provider rejected OPENAI_API_KEY=[REDACTED] AWS_SECRET_ACCESS_KEY=[REDACTED]',
      stack:
        'provider stack access_token=[REDACTED] client_secret="[REDACTED]" request_id=req-safe',
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(
      /sk-private|aws-private|oauth-private|client-private/u,
    );
  });

  test('redacts JSON-shaped secrets without masking diagnostic fields', () => {
    const error = new Error(
      'payload {"access_token":"oauth-private","request_id":"req-message","operation":"inspect"}',
    );
    error.stack =
      'config {"OPENAI_API_KEY":"sk-private","clientSecret":"client-private","request_id":"req-stack","phase":"inspection"}';

    const diagnostic = formatErrorDiagnostic(error);

    expect(diagnostic).toMatchObject({
      message:
        'payload {"access_token":"[REDACTED]","request_id":"req-message","operation":"inspect"}',
      stack:
        'config {"OPENAI_API_KEY":"[REDACTED]","clientSecret":"[REDACTED]","request_id":"req-stack","phase":"inspection"}',
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(/oauth-private|sk-private|client-private/u);
  });

  test('handles non-Error values, cycles, depth, and aggregate width without inventing causes', () => {
    const circular = new Error('circular');
    circular.cause = circular;
    const deep = new Error('depth-0');
    let current = deep;
    for (let depth = 1; depth <= 6; depth += 1) {
      const next = new Error(`depth-${depth}`);
      current.cause = next;
      current = next;
    }
    const aggregate = new AggregateError(
      [circular, deep, 'token=private', 4, false, new Error('omitted')],
      'aggregate',
    );

    const diagnostic = formatErrorDiagnostic(aggregate);

    expect(formatErrorDiagnostic('secret=private')).toEqual({
      type: 'thrown',
      value: 'secret=[REDACTED]',
    });
    expect(diagnostic.errors).toHaveLength(4);
    expect(diagnostic.omittedErrors).toBe(2);
    expect(diagnostic.errors?.[0]?.cause).toEqual({ type: 'circular' });
    expect(JSON.stringify(diagnostic)).toContain('"type":"truncated"');
    expect(formatErrorDiagnostic(new Error('no cause'))).not.toHaveProperty('cause');
  });

  test('reports one structured record with only the allowed context', () => {
    const logger = { error: vi.fn<LoggerService['error']>() };

    reportErrorDiagnostic(
      logger,
      { operation: 'agent.configuration.inspect', agentId: 'agent', agentVersion: '1' },
      new Error('failed'),
    );

    expect(logger.error).toHaveBeenCalledExactlyOnceWith({
      message: 'Library operation failed.',
      operation: 'agent.configuration.inspect',
      agentId: 'agent',
      agentVersion: '1',
      error: expect.objectContaining({ type: 'error', name: 'Error', message: 'failed' }),
    });
  });
});
