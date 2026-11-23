import { mergeConfigurationPatch, resolveConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";
import type { DeepPartial } from "@dataspecer/core/core/utilities/deep-partial";
import { getDefaultUserGivenAlgorithmConfigurationsFull, type UserGivenAlgorithmConfigurations } from "./configurations/user-algorithm-configurations.ts";

export type LayoutConfiguration = UserGivenAlgorithmConfigurations;
export type LayoutConfigurationInput = DeepPartial<LayoutConfiguration>;

export const LAYOUT_ALGORITHM_CONFIGURATION_IRI = "http://dataspecer.com/resources/local/layout-configuration";

export function getLayoutConfigInput(configuration: Configuration): LayoutConfigurationInput {
  return configuration?.[LAYOUT_ALGORITHM_CONFIGURATION_IRI] ?? {};
}

export function layoutConfig(input: LayoutConfigurationInput): { [LAYOUT_ALGORITHM_CONFIGURATION_IRI]: LayoutConfigurationInput } {
  return { [LAYOUT_ALGORITHM_CONFIGURATION_IRI]: input };
}

export function resolveLayoutConfig(configurations: ConfigurationChain): LayoutConfiguration {
  return resolveConfigurationHelper(configurations, getLayoutConfigInput, getDefaultUserGivenAlgorithmConfigurationsFull, mergeConfigurationPatch);
}
