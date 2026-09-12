// oxlint-disable-next-line import/no-unassigned-import -- Nest decorators require this package-level side effect.
import 'reflect-metadata';

export { createRevoCoreRuntime } from './runtime/revo-core-runtime.js';
export type {
  RevoCoreDatabasePreparationOptions,
  RevoCoreLifecycleEvent,
  RevoCoreLifecycleStage,
  RevoCoreListenOptions,
  RevoCoreListenResult,
  RevoCoreRuntime,
  RevoCoreRuntimeOptions,
} from './runtime/revo-core-runtime.types.js';
