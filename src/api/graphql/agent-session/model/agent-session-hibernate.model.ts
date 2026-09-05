import { Field, ObjectType } from '@nestjs/graphql';

import { AgentSessionResumeTokenModel } from './agent-session-resume-token.model.js';

@ObjectType()
export class AgentSessionHibernateModel {
  @Field(() => String)
  state: string;

  @Field(() => AgentSessionResumeTokenModel)
  resumeToken: AgentSessionResumeTokenModel;
}
