import { resolveConfigurationHelper, type Configuration, type ConfigurationChain } from "@dataspecer/core/configuration";
import type { SvgRenderOptions } from "./options.ts";

export const DIAGRAM_CONFIGURATION_KEY = "diagram";

/** Serializable presentation settings. Language is selected for each generated artifact. */
export type DiagramConfiguration = Omit<SvgRenderOptions, "getLink" | "onWarning" | "language">;

export type ConfigWithDiagram = {
  [DIAGRAM_CONFIGURATION_KEY]?: DiagramConfiguration;
};

export function diagramConfig(input: DiagramConfiguration): Required<ConfigWithDiagram> {
  return { [DIAGRAM_CONFIGURATION_KEY]: input };
}

export function resolveDiagramConfig(chain: ConfigurationChain<Configuration & ConfigWithDiagram>): DiagramConfiguration {
  return resolveConfigurationHelper<DiagramConfiguration, DiagramConfiguration>(
    chain,
    layer => layer[DIAGRAM_CONFIGURATION_KEY] as DiagramConfiguration | undefined,
    () => ({}),
    (current, input) => ({
      ...current, ...input,
      prefixes: { ...current.prefixes, ...input.prefixes },
      texts: { ...current.texts, ...input.texts },
    }),
  );
}
