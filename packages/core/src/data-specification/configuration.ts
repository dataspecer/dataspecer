import { type Configuration, type ConfigurationChain } from "../configuration/index.ts";
import { resolveConfigurationHelper } from "../configuration/utils.ts";

export const DefaultDataSpecificationConfiguration = {
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

export function getDataSpecificationConfigInput(configuration: Configuration): DataSpecificationConfigurationInput {
  return configuration?.[DATA_SPECIFICATION_CONFIGURATION_KEY] ?? {};
}

export function dataSpecificationConfig(input: DataSpecificationConfigurationInput): { "data-specification": DataSpecificationConfigurationInput } {
  return { "data-specification": input };
}

export function resolveDataSpecificationConfig(configurations: ConfigurationChain): DataSpecificationConfiguration {
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
