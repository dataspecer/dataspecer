import { type Configuration, type ConfigurationChain } from "../configuration/index.ts";
import { resolveConfigurationHelper } from "../configuration/utils.ts";

export const DefaultDataSpecificationConfiguration = {
  /**
   * If this config is on, than the semantic models (mainly the profile model)
   * will be garbage collected from entities that are not used in the structure
   * models of this data specification. This is useful for SDS that primarily
   * target structure models and use profile models only as a helper layer.
   */
  cleanupSemanticModelForStructures: false,

  /**
   * Base URL for the generated artefacts.
   */
  publicBaseUrl: null as string | null,

  /**
   * Simple configuration to set which artifacts should be included.
   */
  useGenerators: {} as Record<string, boolean>,

  /**
   * Whether instances of this class may/must/must not have identity, for example IRI.
   * If set to undefined, the default value will be used which is "ALWAYS" currently.
   */
  instancesHaveIdentity: "ALWAYS" as "ALWAYS" | "NEVER" | "OPTIONAL",

  /**
   * Require explicit instance typing. For example as @type property in JSON-LD.
   * If set to undefined, the default value will be used which is "ALWAYS" currently.
   */
  instancesSpecifyTypes: "ALWAYS" as "ALWAYS" | "NEVER" | "OPTIONAL",

  /**
   * Whether data must contain a value from the controlled vocabulary that is
   * assigned to a class with the usage "recommended".
   * Classes can override it.
   */
  requireRecommendedControlledVocabularyValue: false,

  /**
   * Whether data must not contain values from outside of the controlled
   * vocabulary that is assigned to a class with the usage "recommended".
   * Classes can override it.
   */
  restrictToRecommendedControlledVocabulary: false,

  dataPsmIsClosed: "OPEN" as "OPEN" | "CLOSED",

  /**
   * Whether generators that are not specified are enabled by default.
   * Use false for instances where a specific set of generators is required.
   */
  generatorsEnabledByDefault: true,

  /**
   * Whether the file path should omit the structure name if there is only one structure in the specification.
   */
  skipStructureNameIfOnlyOne: true,

  /**
   * Explicitly rename artifacts.
   * Artifact generator: new file name
   */
  renameArtifacts: {} as Record<string, string | undefined>,
};

export type DataSpecificationConfiguration = typeof DefaultDataSpecificationConfiguration;

export type DataSpecificationConfigurationInput = Partial<DataSpecificationConfiguration>;

export const DATA_SPECIFICATION_CONFIGURATION_KEY = "data-specification";

export type ConfigWithDataSpecification = {
  [DATA_SPECIFICATION_CONFIGURATION_KEY]?: DataSpecificationConfigurationInput;
};

export function getDataSpecificationConfigInput(configuration: Configuration & ConfigWithDataSpecification): DataSpecificationConfigurationInput {
  return configuration?.[DATA_SPECIFICATION_CONFIGURATION_KEY] ?? {};
}

export function dataSpecificationConfig(input: DataSpecificationConfigurationInput): Required<ConfigWithDataSpecification> {
  return { "data-specification": input };
}

export function resolveDataSpecificationConfig(configurations: ConfigurationChain<Configuration & ConfigWithDataSpecification>): DataSpecificationConfiguration {
  return resolveConfigurationHelper(
    configurations,
    getDataSpecificationConfigInput,
    () => ({
      ...DefaultDataSpecificationConfiguration,
      useGenerators: { ...DefaultDataSpecificationConfiguration.useGenerators },
      renameArtifacts: { ...DefaultDataSpecificationConfiguration.renameArtifacts },
    }),
    (current, input) => ({
      ...current,
      ...input,
      useGenerators: { ...current.useGenerators, ...input.useGenerators },
      renameArtifacts: { ...current.renameArtifacts, ...input.renameArtifacts },
    }),
  );
}
