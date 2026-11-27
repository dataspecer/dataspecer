import { resolveConfigurationHelper, mergeShallowConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";
import { CASINGS } from "./editor/operations/context/operation-context";

export const DefaultClientConfiguration = {
  technicalLabelCasingConvention: "snake_case" as (typeof CASINGS)[number],

  technicalLabelSpecialCharacters: "allow" as "allow" | "remove-diacritics" | "remove-all",

  technicalLabelLanguages: "cs",
};

export type ClientConfiguration = typeof DefaultClientConfiguration;

export type ClientConfigurationInput = Partial<ClientConfiguration>;

export const CLIENT_CONFIGURATION_KEY = "client";

export function getClientConfigInput(configuration: Configuration): ClientConfigurationInput {
  return configuration?.[CLIENT_CONFIGURATION_KEY] ?? {};
}

export function clientConfig(input: ClientConfigurationInput): { client: ClientConfigurationInput } {
  return { client: input };
}

export function resolveClientConfig(configurations: ConfigurationChain): ClientConfiguration {
  return resolveConfigurationHelper(configurations, getClientConfigInput, () => ({ ...DefaultClientConfiguration }), mergeShallowConfigurationHelper);
}
