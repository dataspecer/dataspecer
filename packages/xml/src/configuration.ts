// @see {@link ../configuration/README.md}

import {DeepPartial} from "@dataspecer/core/core/utilities/deep-partial";

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

export interface ConfigurationWithXml {
    [XmlConfigurator.KEY]?: DeepPartial<XmlConfiguration>;
}

export class XmlConfigurator {
    static KEY = "xml" as const;

    static getFromObject(configurationObject: object | null): DeepPartial<XmlConfiguration> {
        return configurationObject?.[XmlConfigurator.KEY] ?? {};
    }

    static setToObject(configurationObject: object, options: DeepPartial<XmlConfiguration>): ConfigurationWithXml {
        return {...configurationObject, [XmlConfigurator.KEY]: options};
    }

    static merge(...options: DeepPartial<XmlConfiguration>[]): DeepPartial<XmlConfiguration> {
        let result: DeepPartial<XmlConfiguration> = {};
        for (const option of options) {
            if (option.generateElementAnnotations !== undefined) {
                result.generateElementAnnotations = option.generateElementAnnotations;
            }
            if (option.generateTypeAnnotations !== undefined) {
                result.generateTypeAnnotations = option.generateTypeAnnotations;
            }
            if (option.generateSawsdl !== undefined) {
                result.generateSawsdl = option.generateSawsdl;
            }
            if (option.extractAllTypes !== undefined) {
                result.extractAllTypes = option.extractAllTypes;
            }
            if (option.elementIriAsAttribute !== undefined) {
                result.elementIriAsAttribute = option.elementIriAsAttribute;
            }
            if (option.commonXmlSchemaExternalLocation !== undefined) {
                result.commonXmlSchemaExternalLocation = option.commonXmlSchemaExternalLocation;
            }
        }

        return result;
    }

    static getDefault() {
        return DefaultXmlConfiguration;
    }
}
