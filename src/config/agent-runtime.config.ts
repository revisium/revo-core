import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { registerAs } from '@nestjs/config';

export const agentRuntimeConfig = registerAs('agentRuntime', () => ({
  workspaceDirectory: resolve(
    process.env.REVO_AGENT_WORKSPACE_ROOT?.trim() || join(homedir(), '.revo', 'sessions'),
  ),
  inheritedEnvironmentNames: (process.env.REVO_AGENT_INHERIT_ENV ?? 'HOME,PATH')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean),
}));
