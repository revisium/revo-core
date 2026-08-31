import type { ProjectStatus } from '../../contracts/project.enums.js';

export type GetUserProjectQueryData = {
  readonly id: string;
};

export type GetUserProjectQueryReturnType = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
} | null;

export class GetUserProjectQuery {
  constructor(readonly data: GetUserProjectQueryData) {}
}
