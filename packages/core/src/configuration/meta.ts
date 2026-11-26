import type { Configuration, ConfigurationChain } from "./model.ts";

export const CONFIGURATION_META_KEY = "meta";

export type ConfigWithMeta = {
  /**
   * Meta configuration. Currently only supports imports of pre-defined
   * configurations.
   */
  [CONFIGURATION_META_KEY]?: {
    /**
     * List of IRIs of pre-defined configurations that will be imported before
     * this configuration. Use this for reusing pre-defined configurations.
     */
    imports?: readonly string[];
  };
};

export type ConfigurationRegistry<Layer extends Configuration = Configuration & ConfigWithMeta> = Readonly<Record<string, Layer>>;

export function configurationImports(imports: readonly string[]): Required<ConfigWithMeta> {
  return { [CONFIGURATION_META_KEY]: { imports: [...imports] } };
}

/**
 * Expands registered presets before each importing layer, recursively and in
 * declaration order. Later layers override earlier ones through scope
 * resolvers. IRIs are registry keys, never fetched. Repeated imports are
 * applied again. Import directives are consumed so the returned chain can
 * safely be expanded again.
 */
export function expandConfigurationImports(
  chain: ConfigurationChain<Configuration & ConfigWithMeta>,
  registry: ConfigurationRegistry,
): ConfigurationChain<Configuration & ConfigWithMeta> {
  const result: Configuration[] = [];
  function expand(configuration: Configuration, path: readonly string[]) {
    const scope = configuration[CONFIGURATION_META_KEY] as { imports?: unknown } | undefined;
    const imports = scope?.imports ?? [];
    if (!Array.isArray(imports) || imports.some(iri => typeof iri !== "string")) {
      throw new Error("Configuration imports must be an array of preset IRIs.");
    }
    for (const iri of imports as string[]) {
      if (path.includes(iri)) {
        throw new Error(`Cyclic configuration import: ${[...path, iri].join(" -> ")}`);
      }
      if (!Object.hasOwn(registry, iri)) {
        throw new Error(`Unknown configuration preset: ${iri}`);
      }
      expand(registry[iri]!, [...path, iri]);
    }
    const layer = { ...configuration };
    if (scope?.imports !== undefined) {
      const { imports: _imports, ...rest } = scope;
      if (Object.keys(rest).length > 0) layer[CONFIGURATION_META_KEY] = rest;
      else delete layer[CONFIGURATION_META_KEY];
    }
    result.push(layer);
  }
  for (const configuration of chain) expand(configuration, []);
  return result;
}
