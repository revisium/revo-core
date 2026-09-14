import type { FileSystemPermissionSet } from '../../../file-system/contracts/file-system.contracts.js';

export type CreatePolicyCommandData = { name: string; document: FileSystemPermissionSet };
export type CreatePolicyCommandReturnType = string;

export class CreatePolicyCommand {
  constructor(readonly data: CreatePolicyCommandData) {}
}
