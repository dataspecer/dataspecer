import type { AllConfiguration } from "../all-configuration.ts";

/**
 * This is a pre-defined configuration for SDS that focus solely on data
 * structures and their goal is not to define application profile.
 */
export const DATA_STRUCTURE_SPECIFICATION_ONLY = "https://schemas.dataspecer.com/configuration/presets/data-structure-specification";

const configuration = {
  "data-specification": {
    cleanupSemanticModelForStructures: true,
  },
  documentation: {
    options: {
      hideProfileIri: true,
    },
  },
  diagram: {
    profileOfMode: "hidden",
    showIris: false,
  },
} as const satisfies AllConfiguration;

export default { [DATA_STRUCTURE_SPECIFICATION_ONLY]: configuration } as const;
