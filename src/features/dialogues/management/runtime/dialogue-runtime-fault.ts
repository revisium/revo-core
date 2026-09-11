import { AgentManagerError, type AgentFault } from '@revisium/revo-agent-runtime';

import { sanitizeErrorText } from '../../../../infrastructure/error-diagnostic.js';

const property = (value: object, key: string): unknown => {
  try {
    return Reflect.get(value, key);
  } catch {
    return undefined;
  }
};

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 && value.length <= 2_000 ? value : undefined;

export const runtimeFaultFrom = (error: unknown): AgentFault | undefined =>
  error instanceof AgentManagerError ? error.fault : undefined;

export const publicFault = (fault: AgentFault): AgentFault => {
  const details = property(fault, 'details');
  const diagnostic =
    details !== null && typeof details === 'object' ? property(details, 'diagnostic') : undefined;
  const provider =
    diagnostic !== null && typeof diagnostic === 'object'
      ? property(diagnostic, 'provider')
      : undefined;
  const providerObject = provider !== null && typeof provider === 'object' ? provider : undefined;
  const providerData = providerObject === undefined ? undefined : property(providerObject, 'data');
  const providerDataObject =
    providerData !== null && typeof providerData === 'object' ? providerData : undefined;
  const providerDataError =
    providerDataObject === undefined ? undefined : property(providerDataObject, 'error');
  const providerDataErrorObject =
    providerDataError !== null && typeof providerDataError === 'object'
      ? providerDataError
      : undefined;
  const cause = property(fault, 'cause');
  const causeObject = cause !== null && typeof cause === 'object' ? cause : undefined;
  const providerMessage =
    (providerDataErrorObject === undefined
      ? undefined
      : text(property(providerDataErrorObject, 'message'))) ??
    (providerDataObject === undefined
      ? undefined
      : (text(property(providerDataObject, 'message')) ??
        text(property(providerDataObject, 'reason')))) ??
    (causeObject === undefined ? undefined : text(property(causeObject, 'message'))) ??
    (providerObject === undefined ? undefined : text(property(providerObject, 'message')));
  return Object.freeze({
    code: fault.code,
    message:
      providerMessage === undefined
        ? sanitizeErrorText(fault.message)
        : sanitizeErrorText(providerMessage),
    phase: fault.phase,
    retryable: fault.retryable,
  });
};
