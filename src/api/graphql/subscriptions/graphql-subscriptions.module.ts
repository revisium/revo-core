import { Module } from '@nestjs/common';

import { GraphqlSubscriptionTransport } from './graphql-subscription-transport.js';

@Module({
  providers: [GraphqlSubscriptionTransport],
  exports: [GraphqlSubscriptionTransport],
})
export class GraphqlSubscriptionsModule {}
