import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

import { registerAs } from '@nestjs/config';

export const runConfig = registerAs('run', () => ({
  temporaryWorkingDirectoryRoot: resolve(
    process.env.REVO_RUN_TEMPORARY_WORKING_DIRECTORY_ROOT?.trim() ||
      join(homedir(), '.revo', 'work'),
  ),
}));
