import type {
  CatalogPage,
  CatalogReadSelector,
  CatalogRecord,
} from '../../contracts/catalog.types.js';

export type ListPlaybooksQueryData = CatalogReadSelector & {
  readonly first: number;
  readonly after?: string;
};

export type ListPlaybooksQueryReturnType = CatalogPage<CatalogRecord>;

export class ListPlaybooksQuery {
  constructor(readonly data: ListPlaybooksQueryData) {}
}
