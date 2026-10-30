import { RdfSourceWrap } from "@dataspecer/core/core/adapter/rdf";
import type { ExtendedSemanticModelClass, SemanticModelClass, SemanticModelGeneralization } from "@dataspecer/core-v2/semantic-model/concepts";
import { POJEM, RDFS } from "../sgov-vocabulary.ts";
import { loadSgovNamedThing } from "./sgov-entity-adapter.ts";

export async function isSgovClass(entity: RdfSourceWrap): Promise<boolean> {
  return (await entity.types()).includes(POJEM.typObjektu);
}

export async function loadSgovClass(entity: RdfSourceWrap): Promise<SemanticModelClass> {
  const result: SemanticModelClass & Partial<ExtendedSemanticModelClass> = {
    id: entity.iri,
    iri: entity.iri,
    type: ["class"],
    ...await loadSgovNamedThing(entity),
  };
  if ((await entity.property("__is_ciselnik"))[0]?.value === "1") {
    result.isCodelist = true;
    result.codelistUrl = [];
  }
  return result;
}

export async function loadSgovGeneralizations(entity: RdfSourceWrap): Promise<SemanticModelGeneralization[]> {
  const parents = new Set(await entity.nodes(RDFS.subClassOf));
  return [...parents].map(parent => ({
    // Preserve identifiers used by existing semantic models.
    id: "https://dataspecer.com/semantic-models/generalization" + new URLSearchParams({ fromIri: entity.iri, toIri: parent }),
    iri: null,
    type: ["generalization"],
    child: entity.iri,
    parent,
  }));
}
