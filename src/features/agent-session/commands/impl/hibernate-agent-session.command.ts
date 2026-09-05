import { Command } from '@nestjs/cqrs';

import type { AgentSessionHibernateReadModel } from '../../contracts/agent-session.contracts.js';

export type HibernateAgentSessionCommandData = { readonly sessionId: string };

export type HibernateAgentSessionCommandReturnType = AgentSessionHibernateReadModel;

export class HibernateAgentSessionCommand extends Command<HibernateAgentSessionCommandReturnType> {
  constructor(readonly data: HibernateAgentSessionCommandData) {
    super();
  }
}
