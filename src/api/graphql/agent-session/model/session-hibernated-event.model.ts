import { Field, ObjectType } from '@nestjs/graphql';

import { AgentSessionEventModel } from './agent-session-event.model.js';

@ObjectType({ implements: () => AgentSessionEventModel })
export class SessionHibernatedEventModel extends AgentSessionEventModel {
  @Field(() => String)
  resumeTokenId: string;

  @Field(() => String)
  resumeTokenSha256: string;
}
