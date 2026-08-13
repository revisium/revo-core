import type {
  CreateRequirementCommandData,
  CreateRequirementCommandReturnType,
} from './create-requirement.command.js';

export type UpdateRequirementCommandData = CreateRequirementCommandData;

export type UpdateRequirementCommandReturnType = CreateRequirementCommandReturnType;

export class UpdateRequirementCommand {
  constructor(readonly data: UpdateRequirementCommandData) {}
}
