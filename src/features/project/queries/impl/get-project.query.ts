import type { Project } from '../../../../__generated__/client/client.js';

export type GetProjectQueryData = {
  readonly id: string;
};

export type GetProjectQueryReturnType = Project;

export class GetProjectQuery {
  constructor(readonly data: GetProjectQueryData) {}
}
