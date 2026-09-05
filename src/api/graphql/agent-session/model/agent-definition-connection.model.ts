import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { AgentDescriptorModel } from './agent-descriptor.model.js';
@ObjectType()
export class AgentDefinitionConnectionModel extends Paginated(AgentDescriptorModel) {}
