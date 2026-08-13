import type { UserProject } from '../../project-records.js';

export type GetUserProjectQueryData = {
  readonly id: string;
};

export type GetUserProjectQueryReturnType = UserProject | null;

export class GetUserProjectQuery {
  constructor(readonly data: GetUserProjectQueryData) {}
}
