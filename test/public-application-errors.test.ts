import { describe, expect, it } from 'vitest';

import { publicErrorDefinitions } from '../src/api/errors/public-error-definitions.js';
import { publicErrorResponse } from '../src/api/errors/public-error-response.js';
import { ApplicationError } from '../src/application/errors/application-error.js';

describe('public application error projection', () => {
  it('preserves the active-run payload and adds remediation without changing the message', () => {
    const response = publicErrorResponse(
      new ApplicationError('PROJECT_HAS_ACTIVE_RUNS', { runIds: ['run-1'] }),
    );

    expect(response).toEqual({
      statusCode: 409,
      code: 'project_has_active_runs',
      message: 'Project has active runs.',
      description: 'Stop or finish the active runs before archiving the project.',
      path: '/projectId',
      details: { runIds: ['run-1'] },
    });
  });

  it('keeps null and empty input paths distinct and allowlists details', () => {
    const empty = publicErrorResponse(
      new ApplicationError('invalid_list_runs_filter', {
        path: '',
        reason: 'unknown_field',
        secret: 'private',
      }),
    );
    const missing = publicErrorResponse(
      new ApplicationError('run_not_found', { runId: 'run-1', path: null, secret: 'private' }),
    );

    expect(empty.path).toBe('');
    expect(empty.details).toEqual({ reason: 'unknown_field' });
    expect(missing.path).toBe(null);
    expect(missing.details).toEqual({ runId: 'run-1' });
  });

  it('does not expose an unknown application code or exception fields', () => {
    const response = publicErrorResponse(
      new ApplicationError('unknown_code' as never, {
        secret: 'private',
        cause: new Error('private'),
      }),
    );

    expect(response).toEqual({ statusCode: 500, message: 'Internal server error.' });
  });

  it.each(Object.entries(publicErrorDefinitions))(
    'keeps the catalog contract for %s',
    (code, definition) => {
      const details = code === 'run_selector_invalid' ? { selector: 'pipeline' } : {};
      const response = publicErrorResponse(new ApplicationError(code as never, details) as never);

      expect(response).toEqual(
        expect.objectContaining({
          statusCode: definition.status,
          ...(code === 'run_selector_invalid' ? {} : { message: definition.message }),
          ...(definition.restError !== undefined
            ? { error: definition.restError }
            : definition.publicCode !== undefined
              ? { code: definition.publicCode }
              : {}),
        }),
      );
    },
  );
});
