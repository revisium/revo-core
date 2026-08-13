export const CONTENT_TABLE = {
  ADR: 'ADR',
  Requirement: 'Requirement',
  WorkPlan: 'WorkPlan',
  WorkItem: 'WorkItem',
} as const;

export type ContentTableId = (typeof CONTENT_TABLE)[keyof typeof CONTENT_TABLE];

export const CONTENT_TABLE_IDS = [
  CONTENT_TABLE.ADR,
  CONTENT_TABLE.Requirement,
  CONTENT_TABLE.WorkPlan,
  CONTENT_TABLE.WorkItem,
] as const;

export type RecordLinkField = {
  readonly field: string;
  readonly target: ContentTableId;
};

export const RECORD_LINK_FIELDS = {
  ADR: [
    { field: 'supersededBy', target: CONTENT_TABLE.ADR },
    { field: 'relatedRequirements', target: CONTENT_TABLE.Requirement },
  ],
  Requirement: [{ field: 'relatedAdr', target: CONTENT_TABLE.ADR }],
  WorkPlan: [],
  WorkItem: [
    { field: 'plan', target: CONTENT_TABLE.WorkPlan },
    { field: 'dependsOn', target: CONTENT_TABLE.WorkItem },
    { field: 'relatedRequirements', target: CONTENT_TABLE.Requirement },
    { field: 'relatedAdr', target: CONTENT_TABLE.ADR },
  ],
} as const satisfies Record<ContentTableId, readonly RecordLinkField[]>;

export function linkFieldsTargeting(
  scanTableId: ContentTableId,
  targetTableId: ContentTableId,
): readonly string[] {
  return RECORD_LINK_FIELDS[scanTableId]
    .filter((link) => link.target === targetTableId)
    .map((link) => link.field);
}

export type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded' | 'rejected';
export type RequirementStatus = 'proposed' | 'accepted' | 'deferred' | 'rejected';
export type WorkPlanStatus = 'draft' | 'ready' | 'closed';

export type AdrAlternative = {
  title: string;
  summary: string;
};

export type UserProject = {
  id: string;
  name: string;
};

export type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
};

export type Connection<T> = {
  edges: { cursor: string; node: T }[];
  pageInfo: PageInfo;
  totalCount: number;
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

export type Requirement = {
  id: string;
  title: string;
  status: RequirementStatus;
  statement: string;
  acceptance: string;
  relatedAdr: string[];
};

export type WorkPlan = {
  id: string;
  title: string;
  status: WorkPlanStatus;
  outcome: string;
  bounds: string;
  baselineId: string;
  acceptance: string;
};

export type WorkItem = {
  id: string;
  title: string;
  cancelled: boolean;
  goal: string;
  inputs: string;
  owner: string;
  constraints: string;
  acceptance: string;
  plan: string;
  dependsOn: string[];
  relatedRequirements: string[];
  relatedAdr: string[];
};

export type AdrWriteData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly status: AdrStatus;
  readonly supersededBy?: string | undefined;
  readonly context: string;
  readonly decision: string;
  readonly alternatives?: readonly AdrAlternative[] | undefined;
  readonly consequences?: string | undefined;
  readonly relatedRequirements?: readonly string[] | undefined;
};

export type RequirementWriteData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly status: RequirementStatus;
  readonly statement: string;
  readonly acceptance: string;
  readonly relatedAdr?: readonly string[] | undefined;
};

export type WorkPlanWriteData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly status: WorkPlanStatus;
  readonly outcome: string;
  readonly bounds: string;
  readonly baselineId?: string | undefined;
  readonly acceptance: string;
};

export type WorkItemWriteData = {
  readonly projectId: string;
  readonly id: string;
  readonly title: string;
  readonly cancelled: boolean;
  readonly goal: string;
  readonly inputs: string;
  readonly owner: string;
  readonly constraints: string;
  readonly acceptance: string;
  readonly plan: string;
  readonly dependsOn?: readonly string[] | undefined;
  readonly relatedRequirements?: readonly string[] | undefined;
  readonly relatedAdr?: readonly string[] | undefined;
};

export type RecordListData = {
  readonly first: number;
  readonly after?: string | undefined;
};

export type ProjectRecordData = {
  [key: string]: string | boolean | string[] | AdrAlternative[];
};

export function adrDataFromWrite(data: AdrWriteData): ProjectRecordData {
  return {
    title: data.title,
    status: data.status,
    supersededBy: data.supersededBy ?? '',
    context: data.context,
    decision: data.decision,
    alternatives: [...(data.alternatives ?? [])],
    consequences: data.consequences ?? '',
    relatedRequirements: [...(data.relatedRequirements ?? [])],
  };
}

export function requirementDataFromWrite(data: RequirementWriteData): ProjectRecordData {
  return {
    title: data.title,
    status: data.status,
    statement: data.statement,
    acceptance: data.acceptance,
    relatedAdr: [...(data.relatedAdr ?? [])],
  };
}

export function workPlanDataFromWrite(data: WorkPlanWriteData): ProjectRecordData {
  return {
    title: data.title,
    status: data.status,
    outcome: data.outcome,
    bounds: data.bounds,
    baselineId: data.baselineId ?? '',
    acceptance: data.acceptance,
  };
}

export function workItemDataFromWrite(data: WorkItemWriteData): ProjectRecordData {
  return {
    title: data.title,
    cancelled: data.cancelled,
    goal: data.goal,
    inputs: data.inputs,
    owner: data.owner,
    constraints: data.constraints,
    acceptance: data.acceptance,
    plan: data.plan,
    dependsOn: [...(data.dependsOn ?? [])],
    relatedRequirements: [...(data.relatedRequirements ?? [])],
    relatedAdr: [...(data.relatedAdr ?? [])],
  };
}

export function adrFromRow(row: { id: string; data: unknown }): Adr {
  const data = asObject(row.data);
  return {
    id: row.id,
    title: asString(data.title),
    status: asUnion(data.status, ADR_STATUSES),
    supersededBy: asString(data.supersededBy),
    context: asString(data.context),
    decision: asString(data.decision),
    alternatives: asAlternatives(data.alternatives),
    consequences: asString(data.consequences),
    relatedRequirements: asStringArray(data.relatedRequirements),
  };
}

export function requirementFromRow(row: { id: string; data: unknown }): Requirement {
  const data = asObject(row.data);
  return {
    id: row.id,
    title: asString(data.title),
    status: asUnion(data.status, REQUIREMENT_STATUSES),
    statement: asString(data.statement),
    acceptance: asString(data.acceptance),
    relatedAdr: asStringArray(data.relatedAdr),
  };
}

export function workPlanFromRow(row: { id: string; data: unknown }): WorkPlan {
  const data = asObject(row.data);
  return {
    id: row.id,
    title: asString(data.title),
    status: asUnion(data.status, WORK_PLAN_STATUSES),
    outcome: asString(data.outcome),
    bounds: asString(data.bounds),
    baselineId: asString(data.baselineId),
    acceptance: asString(data.acceptance),
  };
}

export function workItemFromRow(row: { id: string; data: unknown }): WorkItem {
  const data = asObject(row.data);
  return {
    id: row.id,
    title: asString(data.title),
    cancelled: asBoolean(data.cancelled),
    goal: asString(data.goal),
    inputs: asString(data.inputs),
    owner: asString(data.owner),
    constraints: asString(data.constraints),
    acceptance: asString(data.acceptance),
    plan: asString(data.plan),
    dependsOn: asStringArray(data.dependsOn),
    relatedRequirements: asStringArray(data.relatedRequirements),
    relatedAdr: asStringArray(data.relatedAdr),
  };
}

export function linkValues(data: unknown, field: string): string[] {
  const value = asObject(data)[field];
  if (typeof value === 'string') {
    return value === '' ? [] : [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item !== '');
  }
  return [];
}

const ADR_STATUSES = [
  'proposed',
  'accepted',
  'deprecated',
  'superseded',
  'rejected',
] as const satisfies readonly AdrStatus[];

const REQUIREMENT_STATUSES = [
  'proposed',
  'accepted',
  'deferred',
  'rejected',
] as const satisfies readonly RequirementStatus[];

const WORK_PLAN_STATUSES = [
  'draft',
  'ready',
  'closed',
] as const satisfies readonly WorkPlanStatus[];

function asObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    result[key] = entry;
  }
  return result;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function asUnion<T extends string>(value: unknown, allowed: readonly T[]): T {
  const first = allowed[0];
  if (first === undefined) {
    throw new Error('Status values are not configured.');
  }
  if (typeof value !== 'string') {
    return first;
  }
  const match = allowed.find((item) => item === value);
  return match ?? first;
}

function asAlternatives(value: unknown): AdrAlternative[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item) => {
    const alternative = asObject(item);
    return {
      title: asString(alternative.title),
      summary: asString(alternative.summary),
    };
  });
}
