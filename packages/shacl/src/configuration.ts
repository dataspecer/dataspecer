import { resolveConfigurationHelper, mergeShallowConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";

/**
 * Configuration of the SHACL generator for data structures.
 */
export const DefaultStructuralShaclConfiguration = {
  /**
   * Whether a value of a SKOS-based controlled vocabulary must state its concept scheme (skos:inScheme).
   */
  controlledVocabularyScheme: false as boolean,
};

export type StructuralShaclConfiguration = typeof DefaultStructuralShaclConfiguration;

export type StructuralShaclConfigurationInput = Partial<StructuralShaclConfiguration>;

export const STRUCTURAL_SHACL_CONFIGURATION_KEY = "shacl-structural";

export type ConfigWithStructuralShacl = {
  [STRUCTURAL_SHACL_CONFIGURATION_KEY]?: StructuralShaclConfigurationInput;
};

export function getStructuralShaclConfigInput(configuration: Configuration & ConfigWithStructuralShacl): StructuralShaclConfigurationInput {
  return configuration?.[STRUCTURAL_SHACL_CONFIGURATION_KEY] ?? {};
}

export function structuralShaclConfig(input: StructuralShaclConfigurationInput): Required<ConfigWithStructuralShacl> {
  return { [STRUCTURAL_SHACL_CONFIGURATION_KEY]: input };
}

export function resolveStructuralShaclConfig(configurations: ConfigurationChain<Configuration & ConfigWithStructuralShacl>): StructuralShaclConfiguration {
  return resolveConfigurationHelper(configurations, getStructuralShaclConfigInput, () => ({ ...DefaultStructuralShaclConfiguration }), mergeShallowConfigurationHelper);
}
