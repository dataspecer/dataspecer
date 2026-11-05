import {
  DocumentationConfiguration,
  baseDefaultDocumentationConfiguration,
  internalMergeDocumentationConfigurations,
  PartialDocumentationConfiguration,
} from "@dataspecer/documentation";
import { defaultJsonPartials } from "@dataspecer/json/documentation";
import { defaultXmlPartials } from "@dataspecer/xml/documentation";

/**
 * Default, complete configuration for the documentation generator.
 */
export const defaultDocumentationConfiguration: DocumentationConfiguration = {
  ...baseDefaultDocumentationConfiguration,

  partials: {
    ...baseDefaultDocumentationConfiguration.partials,
    ...defaultJsonPartials,
    ...defaultXmlPartials,
  },
};

/**
 * Merges documentation configurations. It already includes the default configuration.
 * @returns Complete configuration for the documentation generator.
 */
export function mergeDocumentationConfigurations(configurations: PartialDocumentationConfiguration[]): DocumentationConfiguration {
  return internalMergeDocumentationConfigurations([defaultDocumentationConfiguration, ...configurations]);
}

/**
 * List of partial names that belongs to generators.
 */
export const documentationPartialsFromGenerators = [
  ...Object.keys(defaultJsonPartials),
  ...Object.keys(defaultXmlPartials),
];
