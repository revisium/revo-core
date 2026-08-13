import type { Requirement, RequirementWriteData } from '../../requirement.js';

export type CreateRequirementCommandData = RequirementWriteData;

export type CreateRequirementCommandReturnType = Requirement;

export class CreateRequirementCommand {
  constructor(readonly data: CreateRequirementCommandData) {}
}
