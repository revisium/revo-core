import type {
  AgentConfigurationCatalog,
  AgentConfigurationKnownModel,
} from '@revisium/revo-agent-runtime';

export const connectedConfiguration = (
  catalog: AgentConfigurationCatalog,
): AgentConfigurationCatalog =>
  Object.freeze({
    ...catalog,
    ...(catalog.model === undefined
      ? {}
      : {
          model: Object.freeze({
            ...catalog.model,
            providers: Object.freeze(
              catalog.model.providers
                .filter((provider) => provider.connected)
                .map((provider) =>
                  Object.freeze({
                    ...provider,
                    models: Object.freeze(
                      provider.models.filter(
                        (model: AgentConfigurationKnownModel) => model.connected,
                      ),
                    ),
                  }),
                ),
            ),
          }),
        }),
  });

export const connectedConfigurations = (
  snapshot: readonly AgentConfigurationCatalog[],
): readonly AgentConfigurationCatalog[] => Object.freeze(snapshot.map(connectedConfiguration));
