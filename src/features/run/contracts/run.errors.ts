import type { JsonObject } from '@revisium/revo-run';

import { PublicHttpException } from '../../../infrastructure/errors/public-http-exception.js';
import { RunErrorText } from './errors.en.js';

export class RunPublicError extends PublicHttpException {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    path: string | null,
    details: JsonObject,
  ) {
    super({ statusCode, code, message, path, details: structuredClone(details) }, 'response');
  }

  static selector(selector: 'pipeline' | 'profile', reason: string): RunPublicError {
    const message =
      selector === 'pipeline' ? RunErrorText.pipelineSelector : RunErrorText.profileSelector;

    return new RunPublicError(400, 'run_selector_invalid', message, `/${selector}`, { reason });
  }

  static projectIdRequired(): RunPublicError {
    return new RunPublicError(
      400,
      'project_id_invalid',
      RunErrorText.projectIdRequired,
      '/projectId',
      { reason: 'required' },
    );
  }

  static statusesInvalid(): RunPublicError {
    return new RunPublicError(
      400,
      'run_statuses_invalid',
      RunErrorText.statusesInvalid,
      '/statuses',
      { reason: 'invalid_values' },
    );
  }

  static projectReservation(
    code: 'project_unavailable' | 'project_archived',
    message: string,
  ): RunPublicError {
    return new RunPublicError(
      code === 'project_unavailable' ? 404 : 409,
      code,
      message,
      '/projectId',
      {},
    );
  }
}
