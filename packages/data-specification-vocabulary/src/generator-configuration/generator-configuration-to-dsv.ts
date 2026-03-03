import type { NamedNode } from "@rdfjs/types";
import { DataFactory, Writer } from "n3";
import { RDF } from "../semantic-model/vocabulary.ts";
import { GENERATOR_CONFIGURATION_DSV, GENERATOR_CONFIGURATION_DUMP_BASE_IRI } from "./vocabulary.ts";

const IRI = DataFactory.namedNode;
const Literal = DataFactory.literal;

interface GeneratorConfigurationToRdfConfiguration {
  /**
   * List of prefixes that will be forced into the Turtle output.
   * It can override the default prefixes.
   */
  prefixes?: { [prefix: string]: string };
}

/**
 * Check if a string looks like an IRI (contains :// or starts with http)
 */
function looksLikeIri(str: string): boolean {
  return str.includes("://") || str.startsWith("http");
}

/**
 * Convert generator configuration into DSV in RDF.
 *
 * @param iri - The IRI of the main resource and also the base IRI for the
 * output.
 */
export async function generatorConfigurationToRdf(
  iri: string,
  configuration: Record<string, Record<string, any>>,
  options: GeneratorConfigurationToRdfConfiguration = {},
): Promise<string> {
  const prefixes: Record<string, NamedNode | string> = {
    "": iri,
    dsvgc: GENERATOR_CONFIGURATION_DSV.base,
    ce: GENERATOR_CONFIGURATION_DSV.configurationEntry,
    kv: GENERATOR_CONFIGURATION_DSV.dump,
    ...(options.prefixes || {}),
  };

  const writer = new Writer({ prefixes });

  // Create root configuration node
  writer.addQuad(IRI(iri), RDF.type, GENERATOR_CONFIGURATION_DSV["configuration"]);

  for (const [key] of Object.entries(configuration)) {
    const configEntryIri = `${iri}${encodeURIComponent(key)}`;
    writer.addQuad(IRI(iri), GENERATOR_CONFIGURATION_DSV["hasConfigurations"], IRI(configEntryIri));
  }

  // Iterate over all configuration entries
  for (const [key, value] of Object.entries(configuration)) {
    // Create IRI for this configuration entry
    const configEntryIri = `${iri}${encodeURIComponent(key)}`;

    writer.addQuad(IRI(configEntryIri), RDF.type, IRI(GENERATOR_CONFIGURATION_DSV["configurationEntry"]));

    if (looksLikeIri(key)) {
      writer.addQuad(IRI(configEntryIri), GENERATOR_CONFIGURATION_DSV["hasConfigurationType"], IRI(key));
    } else {
      writer.addQuad(IRI(configEntryIri), GENERATOR_CONFIGURATION_DSV["hasConfigurationType"], IRI(GENERATOR_CONFIGURATION_DSV["configurationEntry"] + encodeURIComponent(key)));
    }

    // Serialize all properties of the nested object
    const sortedEntries = Object.entries(value).sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0));
    for (const [propKey, propValue] of sortedEntries) {
      const data = JSON.stringify(propValue);
      writer.addQuad(IRI(configEntryIri), IRI(GENERATOR_CONFIGURATION_DUMP_BASE_IRI + encodeURIComponent(propKey)), Literal(data));
    }
  }

  return new Promise((resolve, reject) =>
    writer.end((error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    }),
  );
}
