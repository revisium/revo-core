import { ConfigModule } from '@nestjs/config';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EngineModule } from '@revisium/engine';
import { nanoid } from 'nanoid';

import { databaseConfig } from '../../src/config/database.config.js';
import type { CatalogRecord } from '../../src/features/playbook-catalog/catalog.types.js';
import type {
  CreateLaunchProfileCommandData,
  CreateMethodDocumentCommandData,
  CreatePipelineCommandData,
  CreatePipelineRoleCommandData,
  CreatePlaybookCommandData,
  CreateRoleCommandData,
  CreateRoleRefCommandData,
  CreateSharedReferenceCommandData,
  CreateStackCommandData,
  CreateStackRefCommandData,
  UpdatePipelineSourceCommandData,
} from '../../src/features/playbook-catalog/commands/index.js';
import { PlaybookCatalogApiService } from '../../src/features/playbook-catalog/playbook-catalog-api.service.js';
import { PlaybookCatalogModule } from '../../src/features/playbook-catalog/playbook-catalog.module.js';
import { ProjectModule } from '../../src/features/project/project.module.js';
import { RevisiumBootstrapModule } from '../../src/features/revisium-bootstrap/revisium-bootstrap.module.js';
import { taskPipeline } from '../fixtures/task-pipeline.js';

export type CatalogTree = {
  playbook: CatalogRecord;
  role: CatalogRecord;
  roleRef: CatalogRecord;
  sharedReference: CatalogRecord;
  stack: CatalogRecord;
  stackRef: CatalogRecord;
  methodDocument: CatalogRecord;
  pipeline: CatalogRecord;
  pipelineRole: CatalogRecord;
  source: CatalogRecord;
  profile: CatalogRecord;
};

export class CatalogTestKit {
  private constructor(
    private readonly module: TestingModule,
    readonly api: PlaybookCatalogApiService,
  ) {}

  static async start(): Promise<CatalogTestKit> {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig] }),
        EngineModule.forRoot(),
        ProjectModule,
        PlaybookCatalogModule,
        RevisiumBootstrapModule,
      ],
    }).compile();
    await module.init();

    return new CatalogTestKit(module, module.get(PlaybookCatalogApiService));
  }

  id(prefix: string): string {
    return `${prefix}_${nanoid()}`;
  }

  playbook(input: Partial<CreatePlaybookCommandData> = {}): CreatePlaybookCommandData {
    return {
      id: input.id ?? this.id('playbook'),
      name: input.name ?? 'Playbook',
    };
  }

  role(playbookId: string, input: Partial<CreateRoleCommandData> = {}): CreateRoleCommandData {
    return {
      id: input.id ?? this.id('role'),
      playbookId,
      body: input.body ?? 'Role',
    };
  }

  roleRef(roleId: string, input: Partial<CreateRoleRefCommandData> = {}): CreateRoleRefCommandData {
    return {
      id: input.id ?? this.id('role_ref'),
      roleId,
      body: input.body ?? 'Role ref',
    };
  }

  sharedReference(
    playbookId: string,
    input: Partial<CreateSharedReferenceCommandData> = {},
  ): CreateSharedReferenceCommandData {
    return {
      id: input.id ?? this.id('shared'),
      playbookId,
      body: input.body ?? 'Shared reference',
    };
  }

  stack(playbookId: string, input: Partial<CreateStackCommandData> = {}): CreateStackCommandData {
    return {
      id: input.id ?? this.id('stack'),
      playbookId,
      body: input.body ?? 'Stack',
    };
  }

  stackRef(
    stackId: string,
    input: Partial<CreateStackRefCommandData> = {},
  ): CreateStackRefCommandData {
    return {
      id: input.id ?? this.id('stack_ref'),
      stackId,
      body: input.body ?? 'Stack ref',
    };
  }

  methodDocument(
    playbookId: string,
    input: Partial<CreateMethodDocumentCommandData> = {},
  ): CreateMethodDocumentCommandData {
    return {
      id: input.id ?? this.id('method'),
      playbookId,
      kind: input.kind ?? 'method',
      body: input.body ?? 'Method',
    };
  }

  pipeline(
    playbookId: string,
    input: Partial<CreatePipelineCommandData> = {},
  ): CreatePipelineCommandData {
    return {
      id: input.id ?? this.id('pipeline'),
      playbookId,
      body: input.body ?? 'Pipeline',
    };
  }

  pipelineRole(
    pipelineId: string,
    roleId: string,
    input: Partial<CreatePipelineRoleCommandData> = {},
  ): CreatePipelineRoleCommandData {
    return {
      id: input.id ?? this.id('pipeline_role'),
      pipelineId,
      roleId,
      membership: input.membership ?? 'required',
    };
  }

  pipelineSource(
    pipelineId: string,
    input: Partial<UpdatePipelineSourceCommandData> = {},
  ): UpdatePipelineSourceCommandData {
    return {
      id: input.id ?? this.id('source'),
      pipelineId,
      sourceJson: input.sourceJson ?? JSON.stringify(taskPipeline()),
    };
  }

  launchProfile(
    pipelineId: string,
    input: Partial<CreateLaunchProfileCommandData> = {},
  ): CreateLaunchProfileCommandData {
    return {
      id: input.id ?? this.id('profile'),
      pipelineId,
      status: input.status ?? 'active',
      bindings: input.bindings ?? [],
    };
  }

  async tree(): Promise<CatalogTree> {
    const playbook = await this.api.createPlaybook(this.playbook());
    const role = await this.api.createRole(this.role(playbook.id));
    const roleRef = await this.api.createRoleRef(this.roleRef(role.id));
    const sharedReference = await this.api.createSharedReference(this.sharedReference(playbook.id));
    const stack = await this.api.createStack(this.stack(playbook.id));
    const stackRef = await this.api.createStackRef(this.stackRef(stack.id));
    const methodDocument = await this.api.createMethodDocument(this.methodDocument(playbook.id));
    const pipeline = await this.api.createPipeline(this.pipeline(playbook.id));
    const pipelineRole = await this.api.createPipelineRole(this.pipelineRole(pipeline.id, role.id));
    const source = await this.api.updatePipelineSource(this.pipelineSource(pipeline.id));
    const profile = await this.api.createLaunchProfile(this.launchProfile(pipeline.id));

    return {
      playbook,
      role,
      roleRef,
      sharedReference,
      stack,
      stackRef,
      methodDocument,
      pipeline,
      pipelineRole,
      source,
      profile,
    };
  }

  idsOf(page: { edges: Array<{ node: { id: string } }> }): string[] {
    return page.edges.map(({ node }) => node.id);
  }

  async discard(): Promise<void> {
    await this.api.discardCatalog();
  }

  async close(): Promise<void> {
    try {
      await this.discard();
    } finally {
      await this.module.close();
    }
  }
}
