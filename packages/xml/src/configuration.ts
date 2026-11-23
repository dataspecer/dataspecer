import { resolveConfigurationHelper, mergeShallowConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";

export const DefaultXmlConfiguration = {
  generateElementAnnotations: true,
  generateTypeAnnotations: true,
  generateSawsdl: true,
  extractAllTypes: false,

  /**
   * Whether the iri of element should be generated as an attribute instead of a child element
   */
  elementIriAsAttribute: false,

  /**
   * If set, the common xml schema will be referenced instead of bundled.
   */
  commonXmlSchemaExternalLocation: null as string | null,
};

/**
 * Type containing all options available for XML and XML related generators.
 */
export type XmlConfiguration = typeof DefaultXmlConfiguration;

export type XmlConfigurationInput = Partial<XmlConfiguration>;

export const XML_CONFIGURATION_KEY = "xml";

export function getXmlConfigInput(configuration: Configuration): XmlConfigurationInput {
  return configuration?.[XML_CONFIGURATION_KEY] ?? {};
}

export function xmlConfig(input: XmlConfigurationInput): { xml: XmlConfigurationInput } {
  return { xml: input };
}

export function resolveXmlConfig(configurations: ConfigurationChain): XmlConfiguration {
  return resolveConfigurationHelper(
    configurations,
    getXmlConfigInput,
    () => ({ ...DefaultXmlConfiguration }),
    (current, input) => mergeShallowConfigurationHelper(current, Object.fromEntries(Object.keys(DefaultXmlConfiguration).map((key) => [key, input[key]])), "skip"),
  );
}
