import type {
  AgentConfigurationCatalog,
  AgentConfigurationSelection,
  AgentSessionAgentDescriptor,
  AgentSessionCheckpoint,
  AgentSessionEvent,
  AgentSessionEventCursor,
  AgentSessionHibernateResult,
  AgentSessionResumeToken,
  AgentSessionSnapshot,
  AgentSessionTerminalRecord,
  AgentSessionTurnResult,
  CancelAgentSessionResult,
  CancelAgentSessionTurnResult,
  CloseAgentSessionResult,
  RespondAgentSessionResult,
} from '@revisium/revo-agent-runtime';

export type AgentDescriptorReadModel = AgentSessionAgentDescriptor;
export type AgentConfigurationReadModel = AgentConfigurationCatalog;
export type AgentConfigurationSelectionData = AgentConfigurationSelection;
export type AgentSessionReadModel = AgentSessionSnapshot;
export type AgentSessionTerminalReadModel = AgentSessionTerminalRecord;
export type AgentSessionTurnResultReadModel = AgentSessionTurnResult;
export type AgentSessionEventReadModel = AgentSessionEvent;
export type AgentSessionEventCursorData = AgentSessionEventCursor;
export type AgentSessionResumeTokenData = AgentSessionResumeToken;
export type { AgentSessionResponseData as RespondAgentSessionData } from './agent-session-response.js';

export interface AgentSessionOpenedReadModel {
  readonly sessionId: string;
  readonly pin: AgentSessionSnapshot['pin'];
  readonly capabilities: NonNullable<AgentSessionSnapshot['capabilities']>;
}

export interface AgentSessionTurnStartedReadModel {
  readonly sessionId: string;
  readonly turnId: string;
}

export interface AgentSessionTrackedTurnReadModel {
  readonly sessionId: string;
  readonly turnId: string;
  readonly state: 'running' | 'completed';
  readonly result?: AgentSessionTurnResult;
}

export type AgentSessionCheckpointReadModel = AgentSessionCheckpoint;
export type AgentSessionHibernateReadModel = AgentSessionHibernateResult;
export type AgentSessionRespondReadModel = RespondAgentSessionResult;
export type AgentSessionCancelReadModel = CancelAgentSessionResult;
export type AgentSessionCancelTurnReadModel = CancelAgentSessionTurnResult;
export type AgentSessionCloseReadModel = CloseAgentSessionResult;

export interface AgentSessionPage<T> {
  readonly edges: readonly { readonly cursor: string; readonly node: T }[];
  readonly totalCount: number;
  readonly pageInfo: {
    readonly startCursor?: string;
    readonly endCursor?: string;
    readonly hasNextPage: boolean;
    readonly hasPreviousPage: boolean;
  };
}

export interface AgentSessionPageData {
  readonly first?: number;
  readonly after?: string;
}
