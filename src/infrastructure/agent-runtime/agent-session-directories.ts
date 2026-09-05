import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';

import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';

import { agentRuntimeConfig } from '../../config/agent-runtime.config.js';

@Injectable()
export class AgentSessionDirectories {
  private outputRoot: string | undefined;

  constructor(
    @Inject(agentRuntimeConfig.KEY)
    private readonly config: ConfigType<typeof agentRuntimeConfig>,
  ) {}

  get workspaceDirectory(): string {
    return this.config.workspaceDirectory;
  }

  async initialize(): Promise<void> {
    await mkdir(this.workspaceDirectory, { recursive: true });
    this.outputRoot = await mkdtemp(join(this.workspaceDirectory, '.output-'));
  }

  outputDirectory(...identity: readonly string[]): string {
    if (this.outputRoot === undefined) {
      throw new Error('Agent session output root is not initialized.');
    }

    const leaf = createHash('sha256').update(JSON.stringify(identity)).digest('hex');

    return join(this.outputRoot, leaf);
  }

  async cleanup(): Promise<void> {
    if (this.outputRoot !== undefined) {
      await rm(this.outputRoot, { recursive: true, force: true });
      this.outputRoot = undefined;
    }
  }
}
