import type {
  CreateWorkItemCommandData,
  CreateWorkItemCommandReturnType,
} from './create-work-item.command.js';

export type UpdateWorkItemCommandData = CreateWorkItemCommandData;

export type UpdateWorkItemCommandReturnType = CreateWorkItemCommandReturnType;

export class UpdateWorkItemCommand {
  constructor(readonly data: UpdateWorkItemCommandData) {}
}
