import type { CoreResource } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import type { NamedNode } from "@rdfjs/types";
import { DataFactory, Writer } from "n3";
import { RDF } from "../vocabulary.ts";
import { DUMP_BASE_IRI, STRUCTURE_MODEL_DSV } from "./vocabulary.ts";

const IRI = DataFactory.namedNode;
const Literal = DataFactory.literal;

interface StructureModelToRdfConfiguration {
  /**
   * List of prefixes that will be forced into the Turtle output.
   * It can override the default prefixes.
   */
  prefixes?: { [prefix: string]: string };
}

/**
 * Convert a structure model into DSV structure model representation in
 * RDF/Turtle format. Since the whole model is only a set of entities (with one
 * schema entity), the only required parameter is the array of entities.
 *
 * @todo How to handle history of the model?
 * @todo Since the interface is not stable yet, we only need to stabilize the
 * concept of core resource as entity. Every additional property can be hotfixed
 * via dumping the JSON content and fixed in future releases.
 */
export async function structureModelToRdf(entities: CoreResource[], configuration: StructureModelToRdfConfiguration = {}): Promise<string> {
  // Find base IRI from schema
  const schema = entities.find(DataPsmSchema.is)!;
  const baseIri = schema.iri!;

  const prefixes: Record<string, NamedNode | string> = {
    "": baseIri,
    "dsvs": STRUCTURE_MODEL_DSV.base,
    "kv": STRUCTURE_MODEL_DSV.dump,
    ...(configuration.prefixes || {}),
  };

  const writer = new Writer({ prefixes });

  for (const entity of entities) {
    writer.addQuad(IRI(entity.iri!), RDF.type, STRUCTURE_MODEL_DSV["entity"]);
    const sortedEntries = Object.entries(entity).sort(([a], [b]) => a > b ? 1 : a < b ? -1 : 0);
    for (const [key, value] of sortedEntries) {
      const data = JSON.stringify(value);
      writer.addQuad(IRI(entity.iri!), IRI(DUMP_BASE_IRI + key), Literal(data));
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
