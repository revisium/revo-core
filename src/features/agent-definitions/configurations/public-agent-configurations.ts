import { projectSelectableAgentConfiguration } from '@revisium/revo-agent-runtime';

import type { AgentConfigurationsSnapshot } from '../contracts/agent-configurations.contracts.js';

export const projectPublicAgentConfigurations = (
  snapshot: AgentConfigurationsSnapshot,
): AgentConfigurationsSnapshot =>
  Object.freeze({
    ...snapshot,
    catalogs: Object.freeze(
      snapshot.catalogs.flatMap((catalog) => {
        const selectable = projectSelectableAgentConfiguration(catalog);
        return selectable === undefined ? [] : [selectable];
      }),
    ),
  });
