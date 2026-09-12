import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const prismaCliPath = (): string => fileURLToPath(import.meta.resolve('prisma/build/index.js'));
const prismaConfigPath = (): string =>
  fileURLToPath(new URL('../../prisma/migrate.config.mjs', import.meta.url));

export const prepareApplicationDatabase = (
  databaseUrl: string,
  signal?: AbortSignal,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const options = {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      ...(signal === undefined ? {} : { signal }),
    };

    execFile(
      process.execPath,
      [prismaCliPath(), 'migrate', 'deploy', '--config', prismaConfigPath()],
      options,
      (error) => {
        if (error === null) {
          resolve();
          return;
        }

        reject(
          error instanceof Error
            ? error
            : new Error('Prisma migration process failed.', { cause: error }),
        );
      },
    );
  });
