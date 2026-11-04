import { applyConfigurationModelSimple, WritableConfigurationModel, type RawConfigurationData } from "@dataspecer/core-v2/configuration-model";
import { defaultConfiguration } from "./default-configuration.ts";

/**
 * Configuration key for the documentation generator.
 */
export const DOCUMENTATION_CONFIGURATION_KEY = "https://schemas.dataspecer.com/documentation-generator-config/";

/**
 * Alternative configuration key for the documentation generator. Because the previous key was too long.
 */
export const ALTERNATIVE_DOCUMENTATION_CONFIGURATION_KEY = "documentation";

export const DOCUMENTATION_MAIN_TEMPLATE_PARTIAL = "specification";

/**
 * Represents configuration for the documentation generator.
 */
export interface DocumentationConfiguration extends PartialDocumentationConfiguration {
  /**
   * List of partials that can be used in the template.
   * Some partials have pre-defined names and are used as the main template or the main template for other parts of the documentation.
   */
  partials: Record<string, string>;
}

/**
 * Partial, non complete, configuration interpreted from a single configuration model.
 *
 * You need to merge this configuration to be complete!
 */
export interface PartialDocumentationConfiguration {
  /**
   * List of partials that can be used in the template.
   * Some partials have pre-defined names and are used as the main template or the main template for other parts of the documentation.
   *
   * If the partial is not present, the value can be derived from parent configuration.
   * If the partial is set to false, the value is removed.
   */
  partials?: Record<string, string | false>;
}

/**
 * Returns partial documentation configuration (so not full, you still need to
 * merge it with the default one) from the configuration object.
 */
export function getPartialDocumentationConfiguration(rawConfiguration: RawConfigurationData): PartialDocumentationConfiguration {
  rawConfiguration ||= {};
  return rawConfiguration[DOCUMENTATION_CONFIGURATION_KEY] || rawConfiguration[ALTERNATIVE_DOCUMENTATION_CONFIGURATION_KEY] || {};
}

export function applyPartialDocumentationConfiguration(configurationModel: WritableConfigurationModel, configuration: PartialDocumentationConfiguration) {
  applyConfigurationModelSimple(configurationModel, DOCUMENTATION_CONFIGURATION_KEY, configuration);
}

/**
 * Default configuration for the documentation generator.
 *
 * @internal
 *
 * Because the default configuration is not complete due to other generators, you may need to merge it with other configurations to get a complete configuration.
 * @see defaultDocumentationConfiguration from {@link @dataspecer/specification}.
 */
export const baseDefaultDocumentationConfiguration: DocumentationConfiguration = defaultConfiguration;

/**
 * Merges documentation configurations into a final configuration. It already includes the default configuration.
 *
 * @internal
 *
 * Because the default configuration is not complete due to other generators, you may need to merge it with other configurations to get a complete configuration.
 * @see mergeDocumentationConfigurations from {@link @dataspecer/specification}.
 */
export function internalMergeDocumentationConfigurations(configurations: PartialDocumentationConfiguration[]): DocumentationConfiguration {
  const result: DocumentationConfiguration = structuredClone(baseDefaultDocumentationConfiguration);
  for (const configuration of configurations) {
    if (configuration.partials) {
      for (const key in configuration.partials) {
        if (configuration.partials[key] === false) {
          delete result.partials[key];
        } else {
          result.partials[key] = configuration.partials[key];
        }
      }
    }
  }

  return result;
}
