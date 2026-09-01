export const ProjectError = {
  notFound: 'Project was not found.',
  nameRequired: 'Name is required.',
  descriptionInvalid: 'Description must be a string.',
  notArchived: 'Project is not archived.',
  initCommitMissing: 'Project creation did not publish the initial revision.',
  recordNotFound: 'Record was not found.',
  recordIdRequired: 'Record id is required.',
} as const;
