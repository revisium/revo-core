import { UseFilters } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { PublicHttpExceptionFilter } from '../../src/api/graphql/public-http-exception.filter.js';
import { publicErrorState } from './public-error-state.js';

@Resolver()
@UseFilters(PublicHttpExceptionFilter)
export class ErrorResolver {
  @Query(() => String, { nullable: true })
  errorProbe(): never {
    throw publicErrorState.failure;
  }

  @Query(() => String)
  healthyProbe(): string {
    return 'ok';
  }

  @Query(() => Int)
  integerProbe(@Args('value', { type: () => Int }) value: number): number {
    return value;
  }
}
