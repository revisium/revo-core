import type { UserProject } from '../../user-project.js';

export type CreateUserProjectCommandData = {
  readonly name: string;
};

export type CreateUserProjectCommandReturnType = UserProject;

export class CreateUserProjectCommand {
  constructor(readonly data: CreateUserProjectCommandData) {}
}
