import type { UserProject } from '../../user-project.js';

export type GetUserProjectQueryData = {
  readonly id: string;
};

export type GetUserProjectQueryReturnType = UserProject | null;

export class GetUserProjectQuery {
  constructor(readonly data: GetUserProjectQueryData) {}
}
