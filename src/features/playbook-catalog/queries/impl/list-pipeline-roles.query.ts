import type {
  CatalogPage,
  CatalogReadSelector,
  CatalogRecord,
} from '../../contracts/catalog.types.js';

export type ListPipelineRolesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly pipelineId?: string;
};

export type ListPipelineRolesQueryReturnType = CatalogPage<CatalogRecord>;

export class ListPipelineRolesQuery {
  constructor(readonly data: ListPipelineRolesQueryData) {}
}
