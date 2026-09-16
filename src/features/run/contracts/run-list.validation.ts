import { RunStatusSchema, type RunStatus } from '@revisium/revo-run';
import { Value } from 'typebox/value';

import { RunPublicError } from './run.errors.js';

export function validateRunListInput(
  projectId: unknown,
  statuses: unknown,
): readonly RunStatus[] | undefined {
  if (typeof projectId !== 'string' || projectId.trim().length === 0) {
    throw RunPublicError.projectIdRequired();
  }

  if (statuses === undefined) {
    return undefined;
  }

  if (!Array.isArray(statuses)) {
    throw RunPublicError.statusesInvalid();
  }

  if (new Set(statuses).size !== statuses.length) {
    throw RunPublicError.statusesInvalid();
  }

  const validStatuses: RunStatus[] = [];
  for (const status of statuses) {
    if (!isRunStatus(status)) {
      throw RunPublicError.statusesInvalid();
    }

    validStatuses.push(status);
  }

  return validStatuses;
}

function isRunStatus(value: unknown): value is RunStatus {
  return Value.Check(RunStatusSchema, value);
}
