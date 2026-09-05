import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { AgentSessionTerminalModel } from './agent-session-terminal.model.js';

@ObjectType()
export class TerminalAgentSessionConnectionModel extends Paginated(AgentSessionTerminalModel) {}
