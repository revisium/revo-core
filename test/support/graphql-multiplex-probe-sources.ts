import { Injectable } from '@nestjs/common';

import { MultiplexProbeSource } from './graphql-multiplex-probe-source.js';

@Injectable()
export class MultiplexProbeSources {
  readonly sources = new Map<string, MultiplexProbeSource>();

  add(id: string): MultiplexProbeSource {
    const source = new MultiplexProbeSource();
    this.sources.set(id, source);

    return source;
  }
}
