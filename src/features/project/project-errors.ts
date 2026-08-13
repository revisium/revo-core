export const ProjectError = {
  notFound: 'Project was not found.',
  nameRequired: 'Name is required.',
  recordNotFound: 'Record was not found.',
  recordIdRequired: 'Record id is required.',
  recordStillReferenced: 'Cannot delete this record because other records still reference it.',
  invalidPageSize: 'first must be between 1 and 100.',
} as const;
