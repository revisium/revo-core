import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execute = promisify(execFile);

const executeChecked = async (
  file: string,
  arguments_: readonly string[],
  options: Parameters<typeof execute>[2],
): Promise<void> => {
  try {
    await execute(file, [...arguments_], options);
  } catch (error) {
    if (typeof error !== 'object' || error === null) {
      throw error;
    }
    const output = ['stdout', 'stderr']
      .map((name) => (name in error ? String(error[name as keyof typeof error]) : ''))
      .filter(Boolean)
      .join('\n');
    throw new Error(`Command failed: ${file}\n${output}`, { cause: error });
  }
};

interface PackedFile {
  readonly path: string;
  readonly size: number;
}

interface PackResult {
  readonly filename: string;
  readonly size: number;
  readonly unpackedSize: number;
  readonly files: readonly PackedFile[];
}

export class PackedCorePackage {
  readonly root: string;
  readonly consumerDirectory: string;
  readonly files: readonly PackedFile[];
  readonly packedSize: number;
  readonly unpackedSize: number;

  private constructor(
    root: string,
    consumerDirectory: string,
    private readonly tarball: string,
    result: PackResult,
  ) {
    this.root = root;
    this.consumerDirectory = consumerDirectory;
    this.files = result.files;
    this.packedSize = result.size;
    this.unpackedSize = result.unpackedSize;
  }

  static async create(repositoryRoot: string): Promise<PackedCorePackage> {
    const root = await mkdtemp(join(tmpdir(), 'revo-core-package-'));
    const packDirectory = join(root, 'pack');
    const consumerDirectory = join(root, 'consumer');
    await Promise.all([mkdir(packDirectory), mkdir(consumerDirectory)]);

    const { stdout } = await execute(
      'npm',
      ['pack', '--json', '--pack-destination', packDirectory],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          npm_config_cache: join(root, 'npm-cache'),
          npm_config_loglevel: 'silent',
        },
      },
    );
    const result = parsePackResult(stdout);
    const fixtureDirectory = join(repositoryRoot, 'test/package/fixtures');
    await Promise.all([
      cp(join(fixtureDirectory, 'runtime-consumer.mjs'), join(consumerDirectory, 'runtime.mjs')),
      cp(
        join(fixtureDirectory, 'runtime-consumer.ts.fixture'),
        join(consumerDirectory, 'consumer.ts'),
      ),
      writeFile(
        join(consumerDirectory, 'package.json'),
        `${JSON.stringify({ private: true, type: 'module', packageManager: 'pnpm@11.13.0' })}\n`,
      ),
      writeFile(
        join(consumerDirectory, 'tsconfig.json'),
        `${JSON.stringify({
          compilerOptions: {
            target: 'ES2024',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            strict: true,
            noEmit: true,
            types: ['node'],
          },
          include: ['consumer.ts'],
        })}\n`,
      ),
    ]);

    return new PackedCorePackage(
      root,
      consumerDirectory,
      join(packDirectory, result.filename),
      result,
    );
  }

  async install(): Promise<void> {
    await executeChecked(
      'corepack',
      [
        'pnpm',
        'add',
        '--prefer-offline',
        '--ignore-scripts',
        this.tarball,
        '--save-dev',
        '@types/node@24.13.3',
      ],
      { cwd: this.consumerDirectory },
    );
  }

  async typecheck(repositoryRoot: string): Promise<void> {
    await executeChecked(join(repositoryRoot, 'node_modules/.bin/tsc'), ['-p', 'tsconfig.json'], {
      cwd: this.consumerDirectory,
    });
  }

  async run(databaseUrl: string): Promise<void> {
    await executeChecked(process.execPath, ['runtime.mjs'], {
      cwd: this.consumerDirectory,
      env: {
        ...process.env,
        DATABASE_URL: undefined,
        REVO_CORE_CONSUMER_DATABASE_URL: databaseUrl,
        REVO_CORE_CONSUMER_RUNTIME_ROOT: join(this.root, 'runtime'),
      },
    });
  }

  paths(): readonly string[] {
    return this.files.map(({ path }) => path);
  }

  async remove(): Promise<void> {
    await rm(this.root, { recursive: true, force: true });
  }
}

const parsePackResult = (output: string): PackResult => {
  const jsonStart = output.lastIndexOf('\n[');
  const parsed: unknown = JSON.parse(output.slice(jsonStart < 0 ? 0 : jsonStart + 1));
  if (!Array.isArray(parsed) || parsed.length !== 1) {
    throw new Error('npm pack returned an unexpected result.');
  }

  const result = parsed[0] as Partial<PackResult>;
  if (
    typeof result.filename !== 'string' ||
    typeof result.size !== 'number' ||
    typeof result.unpackedSize !== 'number' ||
    !Array.isArray(result.files)
  ) {
    throw new Error('npm pack result is incomplete.');
  }

  return result as PackResult;
};
