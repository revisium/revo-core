import type { AgentConfigurationCatalog } from '@revisium/revo-agent-runtime';

export const connectedConfiguration = (
  catalog: AgentConfigurationCatalog,
): AgentConfigurationCatalog | undefined => {
  if (catalog.model === undefined) {
    return catalog;
  }

  const connectedProviders = catalog.model.providers
    .filter(({ connected }) => connected)
    .map((provider) =>
      Object.freeze({
        ...provider,
        models: Object.freeze(provider.models.filter(({ connected }) => connected)),
      }),
    );
  const connectedModels = new Set(
    connectedProviders.flatMap(({ models }) => models.map(({ value }) => value)),
  );
  const modelOption = catalog.options.find(
    (option) => option.type === 'select' && option.id === catalog.model?.optionId,
  );
  const optionValues =
    modelOption?.type === 'select'
      ? new Set(modelOption.values.map(({ value }) => value))
      : new Set<string>();
  const availableValues = new Set(catalog.model.sessionAvailable.map(({ value }) => value));
  const selectableConnectedModels = new Set(
    [...connectedModels].filter((value) => optionValues.has(value) && availableValues.has(value)),
  );
  if (catalog.model.providers.length > 0 && selectableConnectedModels.size === 0) {
    return undefined;
  }
  const providers = connectedProviders
    .map((provider) =>
      Object.freeze({
        ...provider,
        models: Object.freeze(
          provider.models.filter(({ value }) => selectableConnectedModels.has(value)),
        ),
      }),
    )
    .filter(({ models }) => models.length > 0);
  const sessionAvailable =
    catalog.model.providers.length === 0
      ? catalog.model.sessionAvailable
      : catalog.model.sessionAvailable.filter(({ value }) => selectableConnectedModels.has(value));
  const selectedModel = selectableConnectedModels.has(catalog.model.currentModel)
    ? catalog.model.currentModel
    : ([...selectableConnectedModels][0] ?? catalog.model.currentModel);
  const currentProvider = providers.find(({ models }) =>
    models.some(({ value }) => value === selectedModel),
  );
  const options =
    catalog.model.providers.length === 0
      ? catalog.options
      : catalog.options.map((option) =>
          option.type !== 'select' || option.id !== catalog.model?.optionId
            ? option
            : Object.freeze({
                ...option,
                currentValue: selectedModel,
                values: Object.freeze(
                  option.values.filter(({ value }) => selectableConnectedModels.has(value)),
                ),
              }),
        );

  return Object.freeze({
    ...catalog,
    options: Object.freeze(options),
    model: Object.freeze({
      ...catalog.model,
      currentModel: selectedModel,
      ...(currentProvider === undefined
        ? {}
        : {
            currentProvider: Object.freeze({ id: currentProvider.id, name: currentProvider.name }),
          }),
      providers: Object.freeze(providers),
      sessionAvailable: Object.freeze(sessionAvailable),
    }),
  });
};

export const connectedConfigurations = (
  snapshot: readonly AgentConfigurationCatalog[],
): readonly AgentConfigurationCatalog[] =>
  Object.freeze(
    snapshot.flatMap((catalog) => {
      const connected = connectedConfiguration(catalog);
      return connected === undefined ? [] : [connected];
    }),
  );
