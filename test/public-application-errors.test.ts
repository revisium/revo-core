import { describe, expect, it } from 'vitest';

import { publicErrorResponse } from '../src/api/errors/public-error-response.js';

describe('public application error projection', () => {
  it('copies active run IDs without sharing the feature array', () => {
    const runIds = ['run-2', 'run-1'];
    const response = publicErrorResponse({ code: 'project_has_active_runs', details: { runIds } });
    runIds.push('private-later-run');

    expect(response.http.details).toEqual({ runIds: ['run-2', 'run-1'] });
    expect(response.graphql.extensions?.details).toEqual({ runIds: ['run-2', 'run-1'] });
  });

  it('preserves a null path supplied by a typed feature failure', () => {
    const response = publicErrorResponse({
      code: 'invalid_list_runs_filter',
      details: { path: null, reason: 'invalid' },
    });

    expect(response.http).toEqual({
      statusCode: 400,
      code: 'invalid_list_runs_filter',
      message: 'Run-list filter is invalid.',
      path: null,
      details: { reason: 'invalid' },
    });
    expect(response.graphql.extensions).toEqual(response.http);
  });

  it('copies nested diagnostics before the feature value changes', () => {
    const diagnostic = { family: 'pipeline', code: 'test', path: '/node', message: 'Allowed' };
    const response = publicErrorResponse({
      code: 'pipeline_compilation_failed',
      details: { diagnostics: [diagnostic] },
    });
    diagnostic.message = 'Later internal value';

    expect(response.http.details).toEqual({
      diagnostics: [{ family: 'pipeline', code: 'test', path: '/node', message: 'Allowed' }],
    });
    expect(response.graphql.extensions?.details).toEqual(response.http.details);
  });
});
