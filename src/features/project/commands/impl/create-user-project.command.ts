import type { ProjectStatus } from '../../contracts/project.enums.js';

export type CreateUserProjectCommandData = {
  readonly name: string;
  readonly description?: string;
};

export type CreateUserProjectCommandReturnType = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
};

export class CreateUserProjectCommand {
  constructor(readonly data: CreateUserProjectCommandData) {}
}
