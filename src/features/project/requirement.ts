export const REQUIREMENT_TABLE_ID = 'Requirement';

export type RequirementStatus = 'proposed' | 'accepted' | 'deferred' | 'rejected';

export type Requirement = {
  id: string;
  title: string;
  status: RequirementStatus;
  statement: string;
  acceptance: string;
  relatedAdr: string[];
};

export type RequirementWriteData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly status: RequirementStatus;
  readonly statement: string;
  readonly acceptance: string;
  readonly relatedAdr: readonly string[];
};

export function requirementRowData(data: RequirementWriteData) {
  const { projectId: _projectId, id: _id, ...row } = data;
  return row;
}

export function requirementFromRow(row: { id: string; data: unknown }): Requirement {
  if (!isRequirementFields(row.data)) {
    throw new Error('Requirement row data is invalid.');
  }

  return { id: row.id, ...row.data };
}

function isRequirementFields(data: unknown): data is Omit<Requirement, 'id'> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}
