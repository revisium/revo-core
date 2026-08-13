import type { Requirement, RequirementWriteData } from '../../requirement.js';

export type UpdateRequirementCommandData = RequirementWriteData;

export type UpdateRequirementCommandReturnType = Requirement;

export class UpdateRequirementCommand {
  constructor(readonly data: UpdateRequirementCommandData) {}
}
