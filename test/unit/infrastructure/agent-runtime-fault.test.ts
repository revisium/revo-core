import type { LoggerService } from '@nestjs/common';
import {
  AgentManagerError,
  type AgentFault,
  type AgentSessionTurnOutcome,
} from '@revisium/revo-agent-runtime';
import { expect, test, vi } from 'vitest';

import {
  toPublicAgentFault,
  toPublicAgentTurnOutcome,
  reportAgentRuntimeDiagnostic,
} from '../../../src/infrastructure/agent-runtime/agent-runtime-fault.js';

test('keeps the runtime fault message when provider reason is blank', () => {
  const fault = {
    code: 'revo.agent.protocol_failed',
    message: 'The provider session protocol operation failed.',
    phase: 'execution',
    retryable: false,
    details: {
      diagnostic: {
        provider: { message: '   ' },
      },
    },
  } satisfies AgentFault;

  expect(toPublicAgentFault(fault).message).toBe(fault.message);
});

test('keeps provider diagnostics out of public faults', () => {
  const fault = {
    code: 'revo.agent.protocol_failed',
    message: 'The provider session protocol operation failed.',
    phase: 'execution',
    retryable: false,
    details: {
      diagnostic: {
        provider: { message: 'Authorization: Bearer private-token' },
      },
    },
  } satisfies AgentFault;

  expect(toPublicAgentFault(fault)).toEqual({
    code: fault.code,
    message: fault.message,
    phase: fault.phase,
    retryable: fault.retryable,
  });
});

test('projects only the public fault fields for failed and timed-out outcomes', () => {
  const fault = {
    code: 'revo.agent.protocol_failed',
    message: 'The provider session protocol operation failed.',
    phase: 'session_running',
    retryable: true,
    details: {
      diagnostic: {
        provider: { data: { error: { code: -32603, reason: 'No provider configured' } } },
      },
    },
  } satisfies AgentFault;

  for (const status of ['failed', 'timed_out'] as const) {
    const outcome: AgentSessionTurnOutcome = { status, error: fault };

    expect(toPublicAgentTurnOutcome(outcome)).toEqual({
      status,
      error: {
        code: fault.code,
        message: fault.message,
        phase: fault.phase,
        retryable: fault.retryable,
      },
    });
  }
});

test('retains the bounded runtime diagnostic envelope from AgentManagerError', () => {
  const stderr = `${'provider warning '.repeat(150)}[TRUNCATED]`;
  const fault = {
    code: 'revo.agent.protocol_failed',
    message: 'The provider session protocol operation failed.',
    phase: 'session_opening',
    retryable: false,
    details: {
      diagnostic: {
        provider: { code: -32603, message: 'No provider configured' },
        stderr,
        stderrTruncated: true,
      },
    },
  } satisfies AgentFault;
  const wrapped = new AgentManagerError(fault);
  wrapped.stack = 'runtime wrapper stack';
  const logger = { error: vi.fn<LoggerService['error']>() };

  reportAgentRuntimeDiagnostic(logger, { operation: 'dialogue.runtime.open' }, wrapped);

  expect(logger.error.mock.calls[0]?.[0]).toMatchObject({
    runtimeCode: fault.code,
    phase: fault.phase,
    retryable: fault.retryable,
    runtimeDetails: fault.details,
    error: {
      message: 'The provider session protocol operation failed.',
      stack: 'runtime wrapper stack',
    },
  });
});
