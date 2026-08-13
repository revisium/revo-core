import type { CreateWorkItemCommandReturnType } from '../../commands/impl/create-work-item.command.js';

export type GetWorkItemQueryData = {
  readonly projectId: string;
  readonly id: string;
};

export type GetWorkItemQueryReturnType = CreateWorkItemCommandReturnType | null;

export class GetWorkItemQuery {
  constructor(readonly data: GetWorkItemQueryData) {}
}
