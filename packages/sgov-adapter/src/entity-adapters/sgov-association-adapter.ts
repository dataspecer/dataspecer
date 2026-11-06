import type { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { RdfSource, RdfSourceWrap } from "@dataspecer/core/core/adapter/rdf";
import { POJEM, RDFS } from "../sgov-vocabulary.ts";
import { loadSgovNamedThing } from "./sgov-entity-adapter.ts";
import { loadSgovCardinalities } from "./sgov-resource-cardinality-adapter.ts";

export async function isSgovAssociation(entity: RdfSourceWrap): Promise<boolean> {
  return (await entity.types()).includes(POJEM.typVztahu);
}

export async function loadSgovAssociation(entity: RdfSourceWrap, source: RdfSource): Promise<SemanticModelRelationship> {
  const domainCardinality = await entity.node("__domain_cardinality");
  const rangeCardinality = await entity.node("__range_cardinality");
  const domain: [number, number | null] = domainCardinality ? await loadSgovCardinalities(RdfSourceWrap.forIri(domainCardinality, source)) : [0, null];
  const range: [number, number | null] = rangeCardinality ? await loadSgovCardinalities(RdfSourceWrap.forIri(rangeCardinality, source)) : [0, null];
  const metadata = await loadSgovNamedThing(entity);
  return {
    id: entity.iri,
    iri: null,
    type: ["relationship"],
    ...metadata,
    ends: [
      {
        concept: await entity.node(RDFS.domain),
        iri: null,
        name: {},
        description: {},
        nameProperty: null,
        descriptionProperty: null,
        cardinality: domain[0] === 0 && domain[1] === null ? undefined : domain,
      },
      {
        concept: await entity.node(RDFS.range),
        iri: entity.iri,
        ...metadata,
        cardinality: range,
      },
    ],
  };
}
