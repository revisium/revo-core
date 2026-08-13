export type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded' | 'rejected';

export type AdrAlternative = {
  title: string;
  summary: string;
};

export type CreateAdrCommandData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly status: AdrStatus;
  readonly supersededBy: string;
  readonly context: string;
  readonly decision: string;
  readonly alternatives: readonly AdrAlternative[];
  readonly consequences: string;
  readonly relatedRequirements: readonly string[];
};

export type CreateAdrCommandReturnType = { id: string } & Record<string, unknown>;

export class CreateAdrCommand {
  constructor(readonly data: CreateAdrCommandData) {}
}
