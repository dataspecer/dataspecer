import { type ConfigurationRegistry } from "@dataspecer/core/configuration";
import type { AllConfiguration } from "../all-configuration.ts";
import dataStructureSpecificationOnly from "./data-structure-specification-only.ts";

export const predefinedConfigurations = {
  ...dataStructureSpecificationOnly,
} as const satisfies ConfigurationRegistry<AllConfiguration>;


