export const ADR_TABLE_ID = 'ADR';

export type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded' | 'rejected';

export type AdrAlternative = {
  title: string;
  summary: string;
};

export type Adr = {
  id: string;
  title: string;
  status: AdrStatus;
  supersededBy: string;
  context: string;
  decision: string;
  alternatives: AdrAlternative[];
  consequences: string;
  relatedRequirements: string[];
};

export type AdrWriteData = {
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

export function adrRowData(data: AdrWriteData) {
  const { projectId: _projectId, id: _id, ...row } = data;
  return row;
}

export function adrFromRow(row: { id: string; data: unknown }): Adr {
  if (!isAdrFields(row.data)) {
    throw new Error('ADR row data is invalid.');
  }

  return { id: row.id, ...row.data };
}

function isAdrFields(data: unknown): data is Omit<Adr, 'id'> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
