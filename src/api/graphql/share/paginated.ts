import type { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

import { PageInfoModel } from '../project/model/page-info.model.js';

export type PaginatedClass<T> = Type<{
  edges: Array<{ cursor: string; node: T }>;
  totalCount: number;
  pageInfo: PageInfoModel;
}>;

export function Paginated<T>(model: Type<T>): PaginatedClass<T> {
  const typeName = model.name.replace(/Model$/, '');

  @ObjectType(`${typeName}Edge`)
  class EdgeModel {
    @Field()
    cursor: string;

    @Field(() => model)
    node: T;
  }

  @ObjectType(`${typeName}Connection`)
  class ConnectionModel {
    @Field(() => [EdgeModel])
    edges: EdgeModel[];

    @Field(() => Int)
    totalCount: number;

    @Field(() => PageInfoModel)
    pageInfo: PageInfoModel;
  }

  return ConnectionModel;
}
