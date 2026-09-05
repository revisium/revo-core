import { Field, ID, ObjectType } from '@nestjs/graphql';

import { AgentFaultModel } from './agent-fault.model.js';
import { AgentSessionEventCursorModel } from './agent-session-event-cursor.model.js';
import { AgentSessionOutputModel } from './agent-session-output.model.js';
import { AgentSessionPinModel } from './agent-session-pin.model.js';
import { AgentSessionResumeTokenModel } from './agent-session-resume-token.model.js';

@ObjectType()
export class AgentSessionTerminalModel {
  @Field(() => ID)
  sessionId: string;
  @Field(() => AgentSessionPinModel)
  pin: AgentSessionPinModel;
  @Field()
  status: string;
  @Field()
  acceptedAt: string;
  @Field({ nullable: true })
  openedAt?: string;
  @Field()
  finishedAt: string;
  @Field(() => AgentSessionEventCursorModel, { nullable: true })
  cursor?: AgentSessionEventCursorModel;
  @Field(() => AgentSessionOutputModel, { nullable: true })
  output?: AgentSessionOutputModel;
  @Field(() => AgentFaultModel, { nullable: true })
  error?: AgentFaultModel;
  @Field(() => AgentSessionResumeTokenModel, { nullable: true })
  resumeToken?: AgentSessionResumeTokenModel;
  @Field()
  cleanup: string;
}
