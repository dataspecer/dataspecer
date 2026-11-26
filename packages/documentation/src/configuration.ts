import { resolveConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";
import { defaultConfiguration } from "./default-configuration.ts";

export const DOCUMENTATION_CONFIGURATION_KEY = "https://schemas.dataspecer.com/documentation-generator-config/";
export const ALTERNATIVE_DOCUMENTATION_CONFIGURATION_KEY = "documentation";
export const DOCUMENTATION_MAIN_TEMPLATE_PARTIAL = "specification";

export interface DocumentationConfiguration {
  /** {@link DocumentationOptions} */
  options: DocumentationOptions;
  partials: Record<string, string>;
}

export interface DocumentationConfigurationInput {
  /** {@link DocumentationOptions} */
  options?: Partial<DocumentationOptions>;
  /** A false entry removes an inherited partial. */
  partials?: Record<string, string | false>;
}

/**
 * Structured options that can be used in template as `@root.options` to control
 * the output of the documentation generator.
 */
export interface DocumentationOptions {
  /**
   * Show only the original semantic IRIs in class and relationship profile tables.
   */
  hideProfileIri: boolean;
}

export type ConfigWithDocumentation = {
  [DOCUMENTATION_CONFIGURATION_KEY]?: DocumentationConfigurationInput;
  [ALTERNATIVE_DOCUMENTATION_CONFIGURATION_KEY]?: DocumentationConfigurationInput;
};

export function getDocumentationConfigInput(configuration: Configuration & ConfigWithDocumentation): DocumentationConfigurationInput {
  return configuration?.[DOCUMENTATION_CONFIGURATION_KEY] || configuration?.[ALTERNATIVE_DOCUMENTATION_CONFIGURATION_KEY] || {};
}

export function documentationConfig(input: DocumentationConfigurationInput): Required<Pick<ConfigWithDocumentation, typeof DOCUMENTATION_CONFIGURATION_KEY>> {
  return { [DOCUMENTATION_CONFIGURATION_KEY]: input };
}

export const baseDefaultDocumentationConfiguration: DocumentationConfiguration = defaultConfiguration;

export function resolveDocumentationConfig(configurations: ConfigurationChain<Configuration & ConfigWithDocumentation>): DocumentationConfiguration {
  return resolveConfigurationHelper(
    configurations,
    getDocumentationConfigInput,
    () => ({ options: { ...baseDefaultDocumentationConfiguration.options }, partials: { ...baseDefaultDocumentationConfiguration.partials } }),
    (current, input) => {
      const partials = { ...current.partials };
      for (const [key, value] of Object.entries(input.partials ?? {})) {
        if (value === false) {
          delete partials[key];
        } else {
          partials[key] = value;
        }
      }
      return { options: { ...current.options, ...input.options }, partials };
    },
  );
}
