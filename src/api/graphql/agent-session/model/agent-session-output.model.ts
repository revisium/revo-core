import { Field, ObjectType } from '@nestjs/graphql';

import { AgentFaultModel } from './agent-fault.model.js';
import { AgentSessionOutputFilesModel } from './agent-session-output-files.model.js';

@ObjectType()
export class AgentSessionOutputModel {
  @Field(() => String)
  state: string;

  @Field(() => AgentSessionOutputFilesModel)
  files: AgentSessionOutputFilesModel;

  @Field(() => AgentFaultModel, { nullable: true })
  error?: AgentFaultModel;
}
