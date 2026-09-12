import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { registerAs } from '@nestjs/config';

const inheritedEnvironmentDefaults = (): readonly string[] => {
  const names =
    process.platform === 'win32'
      ? [
          'USERPROFILE',
          'APPDATA',
          'LOCALAPPDATA',
          'PATH',
          'PATHEXT',
          'SYSTEMROOT',
          'COMSPEC',
          'TEMP',
          'TMP',
        ]
      : [
          'HOME',
          'USER',
          'LOGNAME',
          'PATH',
          'SHELL',
          'TMPDIR',
          'XDG_CONFIG_HOME',
          'XDG_DATA_HOME',
          'XDG_CACHE_HOME',
        ];
  return names.filter((name) => process.env[name] !== undefined);
};

export const agentRuntimeConfig = registerAs('agentRuntime', () => ({
  workspaceDirectory: resolve(
    process.env.REVO_AGENT_WORKSPACE_ROOT?.trim() || join(homedir(), '.revo', 'sessions'),
  ),
  inheritedEnvironmentNames:
    process.env.REVO_AGENT_INHERIT_ENV === undefined
      ? inheritedEnvironmentDefaults()
      : process.env.REVO_AGENT_INHERIT_ENV.split(',')
          .map((name) => name.trim())
          .filter(Boolean),
}));
