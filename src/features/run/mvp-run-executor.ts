import { Injectable } from '@nestjs/common';
import type { RunExecutor } from '@revisium/revo-run';

type ExecutionInvocation = Parameters<RunExecutor['execute']>[0];
type ExecutionResult = Awaited<ReturnType<RunExecutor['execute']>>;
type ReconcileResult = Awaited<ReturnType<RunExecutor['reconcile']>>;
type CancelResult = Awaited<ReturnType<RunExecutor['cancel']>>;

/** Temporary executor for exercising the run lifecycle before real executors are connected. */
@Injectable()
export class MvpRunExecutor implements RunExecutor {
  execute(invocation: ExecutionInvocation): Promise<ExecutionResult> {
    if (invocation.kind === 'candidate') {
      return Promise.resolve({
        status: 'failed',
        error: {
          code: 'execution_failed',
          message: 'Candidate execution is not available in the MVP executor.',
        },
      });
    }

    return Promise.resolve({
      status: 'completed',
      completion: { kind: 'task' },
    });
  }

  reconcile(): Promise<ReconcileResult> {
    return Promise.resolve({ status: 'not_found' });
  }

  cancel(): Promise<CancelResult> {
    return Promise.resolve({ status: 'not_supported' });
  }
}
