/**
 * Represents a configuration object (that can be obtained from a model) that
 * partially updates configuration. It is a record with keys that specify the
 * scope (such as JSON, XML, etc.) and values specifying the partial
 * configuration for that scope.
 */
export type Configuration = Record<string, unknown>;

/**
 * Chain of configurations that incrementally update the configuration. It needs
 * a resolver to resolve the final configuration for a given scope by merging
 * the configurations in the chain with the default config.
 */
export type ConfigurationChain<Layer extends Configuration = Configuration> = readonly Layer[];

export type ConfigurationResolver<Result> = (configurations: ConfigurationChain) => Result;
