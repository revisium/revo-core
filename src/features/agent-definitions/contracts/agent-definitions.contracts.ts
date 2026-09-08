import type {
  AgentConfigurationCatalog,
  AgentSessionAgentDescriptor,
} from '@revisium/revo-agent-runtime';

export type AgentDefinitionReadModel = AgentSessionAgentDescriptor;
export type AgentConfigurationReadModel = AgentConfigurationCatalog;

export interface AgentDefinitionPage<T> {
  readonly edges: readonly { readonly cursor: string; readonly node: T }[];
  readonly totalCount: number;
  readonly pageInfo: {
    readonly startCursor?: string;
    readonly endCursor?: string;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
  };
}

export interface AgentDefinitionPageData {
  readonly first?: number;
  readonly after?: string;
}
