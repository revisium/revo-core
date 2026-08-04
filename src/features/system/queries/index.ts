import { GetSystemInfoHandler } from './handlers/get-system-info.handler.js';

export {
  GetSystemInfoQuery,
  type GetSystemInfoQueryReturnType,
} from './impl/get-system-info.query.js';

export const SYSTEM_QUERY_HANDLERS = [GetSystemInfoHandler];
