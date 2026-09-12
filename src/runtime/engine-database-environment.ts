let previousCreation = Promise.resolve();

export const createWithEngineDatabaseUrl = async <T>(
  databaseUrl: string,
  create: () => Promise<T>,
): Promise<T> => {
  let releaseCreation: () => void = () => undefined;
  const currentCreation = new Promise<void>((resolve) => {
    releaseCreation = resolve;
  });
  const waitForPreviousCreation = previousCreation;
  previousCreation = currentCreation;
  await waitForPreviousCreation;

  const hadDatabaseUrl = Object.hasOwn(process.env, 'DATABASE_URL');
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;

  try {
    return await create();
  } finally {
    if (hadDatabaseUrl && previousDatabaseUrl !== undefined) {
      process.env.DATABASE_URL = previousDatabaseUrl;
    } else {
      delete process.env.DATABASE_URL;
    }
    releaseCreation();
  }
};
