import type { Quad } from "@rdfjs/types";
import { DataFactory, Parser, Store } from "n3";
import { GENERATOR_CONFIGURATION_DSV, GENERATOR_CONFIGURATION_DUMP_BASE_IRI } from "./vocabulary.ts";
import { RDF } from "../semantic-model/vocabulary.ts";

const IRI = DataFactory.namedNode;

/**
 * Convert RDF representation back into generator configuration object.
 * Returns a Record<string, Record<string, any>>.
 */
export async function rdfToGeneratorConfiguration(iri: string | null, rdf: Quad[]): Promise<Record<string, Record<string, any>>> {
  const store = new Store(rdf);

  if (!iri) {
    const roots = store.getQuads(null, RDF.type, GENERATOR_CONFIGURATION_DSV["configuration"], null);
    if (roots.length !== 1) {
      throw new Error(`Expected exactly one root configuration node if no iri provided, found ${roots.length}`);
    }
    iri = roots[0].subject.value;
  }

  // Find the root configuration node
  const rootConfigQuads = store.getQuads(IRI(iri), GENERATOR_CONFIGURATION_DSV["hasConfigurations"], null, null);
  if (rootConfigQuads.length === 0) {
    return {};
  }

  // Find all configuration entries linked from the root
  const configurationEntries = rootConfigQuads.map((quad) => quad.object);

  const result: Record<string, Record<string, any>> = {};

  for (const entryNode of configurationEntries) {
    const typeIri = store.getQuads(entryNode, GENERATOR_CONFIGURATION_DSV["hasConfigurationType"], null, null)[0]?.object.value;
    let typeKey: string;
    if (typeIri.startsWith(GENERATOR_CONFIGURATION_DSV["configurationEntry"])) {
      typeKey = decodeURIComponent(typeIri.substring(GENERATOR_CONFIGURATION_DSV["configurationEntry"].length));
    } else {
      typeKey = typeIri;
    }

    const configQuads = store.getQuads(entryNode, null, null, null);
    const configData: Record<string, any> = {};
    for (const quad of configQuads) {
      const predicateIri = quad.predicate.value;

      if (!predicateIri.startsWith(GENERATOR_CONFIGURATION_DUMP_BASE_IRI)) {
        continue; // Skip non-data predicates
      }
      let key = decodeURIComponent(predicateIri.substring(GENERATOR_CONFIGURATION_DUMP_BASE_IRI.length));
      let value = JSON.parse(quad.object.value);

      configData[key] = value;
    }
    result[typeKey] = configData;
  }

  return result;
}

/**
 * Parse a Turtle string and convert it to generator configuration object.
 */
export function turtleStringToGeneratorConfiguration(iri: string | null, turtle: string): Promise<Record<string, Record<string, any>>> {
  const parser = new Parser();
  const quads = parser.parse(turtle);
  return rdfToGeneratorConfiguration(iri, quads);
}
