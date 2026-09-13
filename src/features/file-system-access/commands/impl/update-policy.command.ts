import type { FileSystemPermissionSet } from '../../../file-system/contracts/file-system.contracts.js';

export type UpdatePolicyCommandData = {
  id: string;
  expectedVersion: number;
  name: string;
  document: FileSystemPermissionSet;
};
export type UpdatePolicyCommandReturnType = boolean;

export class UpdatePolicyCommand {
  constructor(readonly data: UpdatePolicyCommandData) {}
}
