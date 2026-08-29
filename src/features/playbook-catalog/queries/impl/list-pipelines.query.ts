import type {
  CatalogPage,
  CatalogReadSelector,
  PipelineRecord,
} from '../../contracts/catalog.types.js';

export type ListPipelinesQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
  readonly playbookId?: string;
};

export type ListPipelinesQueryReturnType = CatalogPage<PipelineRecord>;

export class ListPipelinesQuery {
  constructor(readonly data: ListPipelinesQueryData) {}
}
