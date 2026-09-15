import { ProjectApplicationError } from '../../src/features/project/contracts/project.errors.js';
import { RunApplicationError } from '../../src/features/run/contracts/run.errors.js';
import { WorkspaceError } from '../../src/features/workspace/contracts/workspace.errors.js';
// @ts-expect-error runId is required
const missingRunId = new RunApplicationError({ code: 'run_not_found', details: {} });
// @ts-expect-error runId must be a string
const numericRunId = new RunApplicationError({ code: 'run_not_found', details: { runId: 7 } });
const invalidSelector = new RunApplicationError({
  code: 'run_selector_invalid',
  // @ts-expect-error selector is closed
  details: { selector: 'other', reason: 'required' },
});
const invalidReason = new RunApplicationError({
  code: 'run_selector_invalid',
  // @ts-expect-error selector reason is closed
  details: { selector: 'pipeline', reason: 'other' },
});
const invalidField = new WorkspaceError({
  code: 'WORKSPACE_INVALID_INPUT',
  // @ts-expect-error workspace field is closed
  details: { field: 'other' },
});
// @ts-expect-error notFound cannot carry a field
const uncorrelatedWorkspace = new WorkspaceError({
  code: 'WORKSPACE_NOT_FOUND',
  details: { field: 'name' as const },
});
declare const projectCode: 'PROJECT_NOT_FOUND' | 'project_has_active_runs';
// @ts-expect-error independent union code/details is not correlated
const uncorrelatedProject = new ProjectApplicationError({ code: projectCode, details: {} });
const diagnostic = {
  family: 'pipeline',
  code: 'test',
  path: '/test',
  message: 'Allowed',
  secret: 'hidden',
};
const validDiagnostic = new RunApplicationError({
  code: 'pipeline_compilation_failed',
  details: { diagnostics: [diagnostic] },
});
const attempt = { operationId: 'operation', attemptId: 'attempt', secret: 'hidden' };
const validAttempt = new RunApplicationError({
  code: 'run_recovery_required',
  details: { runId: 'run', attempts: [attempt] },
});

void [
  missingRunId,
  numericRunId,
  invalidSelector,
  invalidReason,
  invalidField,
  uncorrelatedWorkspace,
  uncorrelatedProject,
  validDiagnostic,
  validAttempt,
];
