export const ProjectError = {
  notFound: 'Project was not found.',
  nameRequired: 'Name is required.',
  recordNotFound: 'Record was not found.',
  recordIdRequired: 'Record id is required.',
} as const;

export const ProjectTable = {
  adr: 'ADR',
  requirement: 'Requirement',
  workPlan: 'WorkPlan',
  workItem: 'WorkItem',
} as const;
