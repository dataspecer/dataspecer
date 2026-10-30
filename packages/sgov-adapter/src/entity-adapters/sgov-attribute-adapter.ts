import { RdfSourceWrap } from "@dataspecer/core/core/adapter/rdf";
import type { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { loadSgovNamedThing } from "./sgov-entity-adapter.ts";
import { POJEM, RDFS } from "../sgov-vocabulary.ts";
import { loadSgovCardinalities } from "./sgov-resource-cardinality-adapter.ts";

export async function isSgovAttribute(entity: RdfSourceWrap): Promise<boolean> {
  return (await entity.types()).includes(POJEM.typVlastnosti);
}

export async function loadSgovAttribute(entity: RdfSourceWrap): Promise<SemanticModelRelationship> {
  return {
    id: entity.iri,
    iri: null,
    type: ["relationship"],
    name: {},
    description: {},
    nameProperty: null,
    descriptionProperty: null,
    ends: [
      {
        concept: await entity.node(RDFS.domain),
        iri: null,
        name: {},
        description: {},
        nameProperty: null,
        descriptionProperty: null,
        cardinality: [0, null],
      },
      {
        concept: "http://www.w3.org/2000/01/rdf-schema#Literal",
        iri: entity.iri,
        ...(await loadSgovNamedThing(entity)),
        cardinality: await loadSgovCardinalities(entity),
      },
    ],
  };
}
