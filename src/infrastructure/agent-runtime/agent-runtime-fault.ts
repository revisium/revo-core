import type { LoggerService } from '@nestjs/common';
import {
  AgentManagerError,
  type AgentFault,
  type AgentSessionTurnOutcome,
} from '@revisium/revo-agent-runtime';

import { createErrorDiagnosticEntry, type ErrorDiagnosticContext } from '../error-diagnostic.js';

export function agentManagerFault(error: unknown): AgentFault | undefined {
  return error instanceof AgentManagerError ? error.fault : undefined;
}

export function reportAgentRuntimeDiagnostic(
  logger: Pick<LoggerService, 'error'>,
  context: ErrorDiagnosticContext,
  error: unknown,
  fault?: AgentFault,
): void {
  const runtimeFault = fault ?? agentManagerFault(error);
  const entry = createErrorDiagnosticEntry(context, error);
  const runtimeMetadata =
    runtimeFault === undefined
      ? {}
      : {
          runtimeCode: runtimeFault.code,
          phase: runtimeFault.phase,
          retryable: runtimeFault.retryable,
        };
  const runtimeDetails = runtimeFault?.details;
  logger.error(
    runtimeDetails === undefined
      ? { ...entry, ...runtimeMetadata }
      : { ...entry, ...runtimeMetadata, runtimeDetails },
  );
}

export function toPublicAgentFault(fault: AgentFault): AgentFault {
  return Object.freeze({
    code: fault.code,
    message: fault.message,
    phase: fault.phase,
    retryable: fault.retryable,
  });
}

export function toPublicAgentTurnOutcome(
  outcome: AgentSessionTurnOutcome,
): AgentSessionTurnOutcome {
  if (outcome.status !== 'failed' && outcome.status !== 'timed_out') {
    return outcome;
  }

  if (!('error' in outcome) || outcome.error === undefined) {
    return outcome;
  }

  return { status: outcome.status, error: toPublicAgentFault(outcome.error) };
}
