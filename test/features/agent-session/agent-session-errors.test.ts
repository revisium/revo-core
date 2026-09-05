import { AgentManagerError, type AgentFault } from '@revisium/revo-agent-runtime';
import { describe, expect, it } from 'vitest';

import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
  mapAgentSessionError,
} from '../../../src/infrastructure/agent-runtime/agent-session.errors.js';

describe('Agent session application errors', () => {
  it.each<{ runtimeCode: AgentFault['code']; expectedCode: AgentSessionErrorCode }>([
    { runtimeCode: 'revo.agent.session_unknown', expectedCode: AgentSessionErrorCode.notFound },
    {
      runtimeCode: 'revo.agent.interaction_invalid',
      expectedCode: AgentSessionErrorCode.invalidInput,
    },
    {
      runtimeCode: 'revo.agent.continuation_pin_mismatch',
      expectedCode: AgentSessionErrorCode.invalidInput,
    },
    {
      runtimeCode: 'revo.agent.checkpoint_unsupported',
      expectedCode: AgentSessionErrorCode.unsupported,
    },
    { runtimeCode: 'revo.agent.session_capacity', expectedCode: AgentSessionErrorCode.unavailable },
    { runtimeCode: 'revo.agent.manager_closed', expectedCode: AgentSessionErrorCode.unavailable },
    {
      runtimeCode: 'revo.agent.manager_not_initialized',
      expectedCode: AgentSessionErrorCode.unavailable,
    },
    {
      runtimeCode: 'revo.agent.session_state_unavailable',
      expectedCode: AgentSessionErrorCode.unavailable,
    },
    { runtimeCode: 'revo.agent.session_busy', expectedCode: AgentSessionErrorCode.conflict },
    {
      runtimeCode: 'revo.agent.resume_token_consumed',
      expectedCode: AgentSessionErrorCode.conflict,
    },
    { runtimeCode: 'revo.agent.session_duplicate', expectedCode: AgentSessionErrorCode.conflict },
    { runtimeCode: 'revo.agent.configuration_stale', expectedCode: AgentSessionErrorCode.conflict },
    { runtimeCode: 'revo.agent.session_closed', expectedCode: AgentSessionErrorCode.conflict },
    { runtimeCode: 'revo.agent.internal', expectedCode: AgentSessionErrorCode.internal },
  ])('maps $runtimeCode to $expectedCode', ({ runtimeCode, expectedCode }) => {
    const failure = new AgentManagerError({
      code: runtimeCode,
      message: 'Runtime rejected the operation.',
      phase: 'manager',
      retryable: false,
    });

    expect(mapAgentSessionError(failure)).toMatchObject({
      code: expectedCode,
      message: 'Runtime rejected the operation.',
      details: { runtimeCode, retryable: false },
    });
  });

  it('preserves an existing application error', () => {
    const error = new AgentSessionApplicationError(
      AgentSessionErrorCode.invalidCursor,
      'Invalid cursor.',
    );

    expect(mapAgentSessionError(error)).toBe(error);
  });

  it('does not expose arbitrary internal exception messages', () => {
    const error = mapAgentSessionError(new Error('Private internal information.'));

    expect(error).toMatchObject({
      code: AgentSessionErrorCode.internal,
      message: 'Agent session operation failed.',
      details: {},
    });
  });
});
