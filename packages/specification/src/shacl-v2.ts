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

export interface PartialShaclConfiguration {
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
    },
  },
};

export interface ConfigurationWithShaclV2 {
  [ShaclV2Configurator.KEY]?: PartialShaclConfiguration;
}

export class ShaclV2Configurator {
  static KEY = "shacl-v2" as const;

  static getFromObject(configurationObject: object | null): PartialShaclConfiguration {
    return (configurationObject as any)?.[ShaclV2Configurator.KEY] ?? {};
  }

  static setToObject(configurationObject: object, options: PartialShaclConfiguration): ConfigurationWithShaclV2 {
    return { ...configurationObject, [ShaclV2Configurator.KEY]: options };
  }

  static merge(...options: [ShaclConfiguration, ...PartialShaclConfiguration[]]): ShaclConfiguration {
    let result = { ...options[0] };

    for (const option of options) {
      if (option.files) {
        const previousDefault = result.files[DefaultShaclFileKey] ?? DefaultShaclConfiguration.files[DefaultShaclFileKey]!;
        result.files = {};

        for (const [key, fileConfig] of Object.entries(option.files)) {
          result.files[key] = {
            ...previousDefault,
            ...fileConfig,
          };
        }
      }
    }
    return result;
  }

  static getDefault(): ShaclConfiguration {
    return DefaultShaclConfiguration;
  }
}
