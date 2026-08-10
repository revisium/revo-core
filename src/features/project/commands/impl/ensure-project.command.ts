import type { Project } from '../../../../__generated__/client/client.js';
import type { ProjectKind } from '../../../../__generated__/client/enums.js';

export type EnsureProjectCommandData = {
  readonly id: string;
  readonly name: string;
  readonly kind: ProjectKind;
};

export type EnsureProjectCommandReturnType = Project['id'];

export class EnsureProjectCommand {
  constructor(readonly data: EnsureProjectCommandData) {}
}
