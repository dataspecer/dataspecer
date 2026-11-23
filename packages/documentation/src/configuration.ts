import { resolveConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";
import { defaultConfiguration } from "./default-configuration.ts";

export const DOCUMENTATION_CONFIGURATION_KEY = "https://schemas.dataspecer.com/documentation-generator-config/";
export const ALTERNATIVE_DOCUMENTATION_CONFIGURATION_KEY = "documentation";
export const DOCUMENTATION_MAIN_TEMPLATE_PARTIAL = "specification";

export interface DocumentationConfiguration {
  partials: Record<string, string>;
}

export interface DocumentationConfigurationInput {
  /** A false entry removes an inherited partial. */
  partials?: Record<string, string | false>;
}

export function getDocumentationConfigInput(configuration: Configuration): DocumentationConfigurationInput {
  return configuration?.[DOCUMENTATION_CONFIGURATION_KEY] || configuration?.[ALTERNATIVE_DOCUMENTATION_CONFIGURATION_KEY] || {};
}

export function documentationConfig(input: DocumentationConfigurationInput): { [DOCUMENTATION_CONFIGURATION_KEY]: DocumentationConfigurationInput } {
  return { [DOCUMENTATION_CONFIGURATION_KEY]: input };
}

export const baseDefaultDocumentationConfiguration: DocumentationConfiguration = defaultConfiguration;

export function resolveDocumentationConfig(configurations: ConfigurationChain): DocumentationConfiguration {
  return resolveConfigurationHelper(
    configurations,
    getDocumentationConfigInput,
    () => ({ partials: { ...baseDefaultDocumentationConfiguration.partials } }),
    (current, input) => {
      const partials = { ...current.partials };
      for (const [key, value] of Object.entries(input.partials ?? {})) {
        if (value === false) {
          delete partials[key];
        } else {
          partials[key] = value;
        }
      }
      return { partials };
    },
  );
}
