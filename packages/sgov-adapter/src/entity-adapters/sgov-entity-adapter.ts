import { RdfObject, RdfSourceWrap } from "@dataspecer/core/core/adapter/rdf";
import type { LanguageString, NamedThing } from "@dataspecer/core-v2/semantic-model/concepts";
import { SKOS } from "../sgov-vocabulary.ts";

export async function loadSgovNamedThing(entity: RdfSourceWrap): Promise<NamedThing> {
  return {
    name: rdfObjectsToLanguageString(await entity.property(SKOS.prefLabel)),
    description: rdfObjectsToLanguageString(await entity.property(SKOS.definition)),
    nameProperty: null,
    descriptionProperty: null,
  };
}

function rdfObjectsToLanguageString(objects: RdfObject[]): LanguageString {
  return Object.fromEntries(objects.filter(RdfObject.isLiteral).map((o) => [o.language, o.value]));
}
