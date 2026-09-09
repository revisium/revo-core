import { AgentManagerError, type AgentFault } from '@revisium/revo-agent-runtime';
import { describe, expect, it } from 'vitest';

import {
  AgentDefinitionsApplicationError,
  AgentDefinitionsErrorCode,
  mapAgentDefinitionsError,
} from '../../../src/features/agent-definitions/contracts/agent-definitions.errors.js';

describe('Agent definition application errors', () => {
  it.each<{ runtimeCode: AgentFault['code']; expectedCode: AgentDefinitionsErrorCode }>([
    { runtimeCode: 'revo.agent.agent_unknown', expectedCode: AgentDefinitionsErrorCode.notFound },
    {
      runtimeCode: 'revo.agent.configuration_value_unsupported',
      expectedCode: AgentDefinitionsErrorCode.unsupported,
    },
    {
      runtimeCode: 'revo.agent.manager_closed',
      expectedCode: AgentDefinitionsErrorCode.unavailable,
    },
    {
      runtimeCode: 'revo.agent.manager_not_initialized',
      expectedCode: AgentDefinitionsErrorCode.unavailable,
    },
    {
      runtimeCode: 'revo.agent.configuration_stale',
      expectedCode: AgentDefinitionsErrorCode.conflict,
    },
    { runtimeCode: 'revo.agent.internal', expectedCode: AgentDefinitionsErrorCode.internal },
  ])('maps $runtimeCode to $expectedCode', ({ runtimeCode, expectedCode }) => {
    const failure = new AgentManagerError({
      code: runtimeCode,
      message: 'Runtime rejected the operation.',
      phase: 'manager',
      retryable: false,
    });

    expect(mapAgentDefinitionsError(failure)).toMatchObject({
      code: expectedCode,
      details: { runtimeCode, retryable: false },
    });
  });

  it('preserves an existing application error', () => {
    const error = new AgentDefinitionsApplicationError(
      AgentDefinitionsErrorCode.invalidCursor,
      'Invalid cursor.',
    );

    expect(mapAgentDefinitionsError(error)).toBe(error);
  });

  it('does not expose arbitrary internal exception messages', () => {
    const error = mapAgentDefinitionsError(new Error('Private internal information.'));

    expect(error).toMatchObject({
      code: AgentDefinitionsErrorCode.internal,
      message: 'Agent definition operation failed.',
      details: {},
    });
  });
});
