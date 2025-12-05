import type { CoreResource } from "@dataspecer/core/core/core-resource";
import type { Quad } from "@rdfjs/types";
import { Parser, Store } from "n3";
import { RDF } from "../vocabulary.ts";
import { DUMP_BASE_IRI, STRUCTURE_MODEL_DSV } from "./vocabulary.ts";

export async function rdfToStructureModel(rdf: Quad[]): Promise<CoreResource[]> {
  const store = new Store(rdf);

  const structureEntities = store.getQuads(null, RDF.type, STRUCTURE_MODEL_DSV["entity"], null).map((quad) => quad.subject);
  const entities: CoreResource[] = [];

  for (const subject of structureEntities) {
    const entity: Record<string, any> = {};
    //const iri = subject.value;

    const entityQuads = store.getQuads(subject, null, null, null);
    for (const quad of entityQuads) {
      const predicateIri = quad.predicate.value;
      if (predicateIri.startsWith(DUMP_BASE_IRI)) {
        const key = predicateIri.substring(DUMP_BASE_IRI.length);
        const serializedData = quad.object.value;
        const value = JSON.parse(serializedData);
        entity[key] = value;
      }
    }

    entities.push(entity as CoreResource);
  }

  return entities;
}

export function turtleStringToStructureModel(turtle: string): Promise<CoreResource[]> {
  const parser = new Parser();
  const quads = parser.parse(turtle);
  return rdfToStructureModel(quads);
}
