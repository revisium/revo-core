import type {
  CatalogPage,
  CatalogReadSelector,
  LaunchProfileRecord,
} from '../../contracts/catalog.types.js';

export type ListLaunchProfilesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly pipelineId?: string;
};

export type ListLaunchProfilesQueryReturnType = CatalogPage<LaunchProfileRecord>;

export class ListLaunchProfilesQuery {
  constructor(readonly data: ListLaunchProfilesQueryData) {}
}
