import { resolveConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";
import type { SemanticModelsToShaclConfiguration } from "@dataspecer/shacl-v2";

/**
 * Key used for different SHACL files. The key will be used to create a file name.
 *
 * Empty string is used for the default configuration.
 */
export type ShaclFileKey = string;

export const DefaultShaclFileKey: ShaclFileKey = "";

export interface ShaclConfiguration {
  /**
   * Configuration for individual SHACL files.
   */
  files: Record<ShaclFileKey, SemanticModelsToShaclConfiguration>;
}

export interface ShaclConfigurationInput {
  files?: Record<ShaclFileKey, Partial<SemanticModelsToShaclConfiguration>>;
}

export const DefaultShaclConfiguration: ShaclConfiguration = {
  files: {
    // This is the default configuration
    [DefaultShaclFileKey]: {
      policy: "semic-v1",
      languages: [],
      noClassConstraints: false,
      splitPropertyShapesByConstraints: false,
      controlledVocabularyPattern: true,
      controlledVocabularyScheme: false,
      profileSpecializationAsSubClassOf: false,
    },
  },
};

export const SHACL_CONFIGURATION_KEY = "shacl-v2";

export function getShaclConfigInput(configuration: Configuration): ShaclConfigurationInput {
  return configuration?.[SHACL_CONFIGURATION_KEY] ?? {};
}

export function shaclConfig(input: ShaclConfigurationInput): { "shacl-v2": ShaclConfigurationInput } {
  return { "shacl-v2": input };
}

export function resolveShaclConfig(configurations: ConfigurationChain): ShaclConfiguration {
  return resolveConfigurationHelper<ShaclConfigurationInput, ShaclConfiguration>(
    configurations,
    getShaclConfigInput,
    () => ({ files: Object.fromEntries(Object.entries(DefaultShaclConfiguration.files).map(([key, file]) => [
      key, { ...file, languages: [...file.languages] },
    ])) }),
    (current, input) => {
      if (!input.files) {
        return current;
      }
      const previousDefault = current.files[DefaultShaclFileKey] ?? DefaultShaclConfiguration.files[DefaultShaclFileKey]!;
      return {
        files: Object.fromEntries(Object.entries(input.files).map(([key, file]) => [key, {
          ...previousDefault,
          ...file,
        }])),
      };
    },
  );
}
