import { Client } from 'pg';

export class IsolatedRuntimeDatabase {
  readonly url: string;

  private constructor(
    private readonly adminUrl: string,
    private readonly name: string,
    url: string,
  ) {
    this.url = url;
  }

  static async create(): Promise<IsolatedRuntimeDatabase> {
    const configuredUrl = process.env.DATABASE_URL;
    if (configuredUrl === undefined) {
      throw new Error('DATABASE_URL is required for runtime integration tests.');
    }

    const name = `revo_core_runtime_${process.pid}`;
    const admin = new URL(configuredUrl);
    admin.pathname = '/postgres';
    const database = new URL(configuredUrl);
    database.pathname = `/${name}`;
    const fixture = new IsolatedRuntimeDatabase(admin.toString(), name, database.toString());
    await fixture.executeAdmin(`CREATE DATABASE "${name}"`);
    return fixture;
  }

  async relations(): Promise<{
    prismaMigrations: string | null;
    dbosWorkflowStatus: string | null;
  }> {
    const client = new Client({ connectionString: this.url });
    await client.connect();
    try {
      const result = await client.query<{
        prisma_migrations: string | null;
        dbos_workflow_status: string | null;
      }>(
        `SELECT
           to_regclass('public._prisma_migrations')::text AS prisma_migrations,
           to_regclass('dbos.workflow_status')::text AS dbos_workflow_status`,
      );
      const row = result.rows[0];
      if (row === undefined) {
        throw new Error('Database relation probe returned no row.');
      }
      return {
        prismaMigrations: row.prisma_migrations,
        dbosWorkflowStatus: row.dbos_workflow_status,
      };
    } finally {
      await client.end();
    }
  }

  async insertProject(project: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
  }): Promise<void> {
    const client = new Client({ connectionString: this.url });
    await client.connect();
    try {
      await client.query(
        `INSERT INTO projects (id, name, description, status, kind, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'ACTIVE', 'USER', now(), now())`,
        [project.id, project.name, project.description],
      );
    } finally {
      await client.end();
    }
  }

  async project(id: string): Promise<{ name: string; description: string } | undefined> {
    const client = new Client({ connectionString: this.url });
    await client.connect();
    try {
      const result = await client.query<{ name: string; description: string }>(
        'SELECT name, description FROM projects WHERE id = $1',
        [id],
      );
      return result.rows[0];
    } finally {
      await client.end();
    }
  }

  async drop(): Promise<void> {
    await this.executeAdmin(`DROP DATABASE IF EXISTS "${this.name}" WITH (FORCE)`);
  }

  private async executeAdmin(statement: string): Promise<void> {
    const client = new Client({ connectionString: this.adminUrl });
    await client.connect();
    try {
      await client.query(statement);
    } finally {
      await client.end();
    }
  }
}
