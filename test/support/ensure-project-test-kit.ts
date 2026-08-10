import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EngineApiService, EngineModule } from '@revisium/engine';
import { nanoid } from 'nanoid';

import { ProjectKind } from '../../src/__generated__/client/enums.js';
import { databaseConfig } from '../../src/config/database.config.js';
import { ProjectApiService } from '../../src/features/project/project-api.service.js';
import { ProjectModule } from '../../src/features/project/project.module.js';
import { PrismaService } from '../../src/infrastructure/database/prisma.service.js';

export class EnsureProjectTestKit {
  private readonly projectIds = new Set<string>();

  private constructor(
    private readonly module: TestingModule,
    readonly projectApi: ProjectApiService,
    readonly engine: EngineApiService,
    private readonly prisma: PrismaService,
  ) {}

  static async start(): Promise<EnsureProjectTestKit> {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
        EngineModule.forRoot(),
        ProjectModule,
      ],
    }).compile();
    await module.init();

    return new EnsureProjectTestKit(
      module,
      module.get(ProjectApiService),
      module.get(EngineApiService),
      module.get(PrismaService),
    );
  }

  systemProject() {
    const suffix = nanoid();
    const id = `test_system_${suffix}`;
    const name = `Test system project ${suffix}`;
    this.projectIds.add(id);

    return {
      id,
      name,
      kind: ProjectKind.SYSTEM,
    };
  }

  async cleanup(): Promise<void> {
    const projectIds = [...this.projectIds];
    if (projectIds.length === 0) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.branch.deleteMany({ where: { projectId: { in: projectIds } } }),
      this.prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
    ]);
    this.projectIds.clear();
  }

  async close(): Promise<void> {
    try {
      await this.cleanup();
    } finally {
      await this.module.close();
    }
  }
}
