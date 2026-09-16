import { PublicHttpException } from '../../../infrastructure/errors/public-http-exception.js';
import { AgentDefinitionsErrorText } from './errors.en.js';

export const AgentDefinitionsErrorCode = {
  invalidCursor: 'REVO_AGENT_SESSION_INVALID_CURSOR',
  expiredCursor: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
} as const;

export type AgentDefinitionsErrorCode =
  (typeof AgentDefinitionsErrorCode)[keyof typeof AgentDefinitionsErrorCode];

export class AgentDefinitionsApplicationError extends PublicHttpException {
  constructor(readonly code: AgentDefinitionsErrorCode) {
    super(
      {
        statusCode: code === AgentDefinitionsErrorCode.invalidCursor ? 400 : 404,
        code,
        message: AgentDefinitionsErrorText[code],
        path: null,
      },
      'minimal',
    );
  }
}
