import { Args, Query, Resolver, Subscription } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

import { MultiplexProbeSources } from './graphql-multiplex-probe-sources.js';

@Resolver()
export class GraphqlMultiplexProbeResolver {
  constructor(private readonly probes: MultiplexProbeSources) {}

  @Query(() => String)
  multiplexProbe(): string {
    return 'ready';
  }

  @Subscription(() => String, { resolve: (value: string) => value })
  multiplexProbeEvents(@Args('id') id: string): AsyncIterable<string> {
    const source = this.probes.sources.get(id);

    if (source === undefined) {
      throw new GraphQLError('Unknown probe.', { extensions: { code: 'NOT_FOUND' } });
    }

    return source;
  }
}
