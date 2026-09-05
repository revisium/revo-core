import { ObjectType } from '@nestjs/graphql';

import { Paginated } from '../../share/paginated.js';
import { AgentSessionSnapshotModel } from './agent-session-snapshot.model.js';

@ObjectType()
export class AgentSessionConnectionModel extends Paginated(AgentSessionSnapshotModel) {}
