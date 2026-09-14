import type { FileSystemPolicyRecord } from '../../contracts/file-system-policy.contracts.js';

export type GetPolicyQueryData = { id: string };
export type GetPolicyQueryReturnType = FileSystemPolicyRecord;

export class GetPolicyQuery {
  constructor(readonly data: GetPolicyQueryData) {}
}
