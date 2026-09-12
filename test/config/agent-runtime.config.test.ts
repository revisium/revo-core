import { expect, test } from 'vitest';

import { agentRuntimeConfig } from '../../src/config/agent-runtime.config.js';

const restoreEnvironment = (name: string, value: string | undefined): void => {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
};

test('keeps the platform user identity in the default agent environment', () => {
  const identityName = process.platform === 'win32' ? 'USERPROFILE' : 'USER';
  const previousAllowlist = process.env.REVO_AGENT_INHERIT_ENV;
  const previousIdentity = process.env[identityName];
  delete process.env.REVO_AGENT_INHERIT_ENV;
  process.env[identityName] = 'fixture-user';

  try {
    expect(agentRuntimeConfig().inheritedEnvironmentNames).toContain(identityName);
  } finally {
    restoreEnvironment('REVO_AGENT_INHERIT_ENV', previousAllowlist);
    restoreEnvironment(identityName, previousIdentity);
  }
});

test('treats an explicit agent environment allowlist as a complete replacement', () => {
  const previousAllowlist = process.env.REVO_AGENT_INHERIT_ENV;
  process.env.REVO_AGENT_INHERIT_ENV = 'HOME, PROVIDER_TOKEN';

  try {
    expect(agentRuntimeConfig().inheritedEnvironmentNames).toEqual(['HOME', 'PROVIDER_TOKEN']);
  } finally {
    restoreEnvironment('REVO_AGENT_INHERIT_ENV', previousAllowlist);
  }
});
