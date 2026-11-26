import { type ConfigurationChain, expandConfigurationImports } from "@dataspecer/core/configuration";
import type { AllConfiguration } from "./all-configuration.ts";
import { predefinedConfigurations } from "./predefined-configurations/index.ts";

export function expandSpecificationConfiguration(chain: ConfigurationChain<AllConfiguration>): ConfigurationChain<AllConfiguration> {
  return expandConfigurationImports(chain, predefinedConfigurations);
}
