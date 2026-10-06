import {ConceptualModel, ConceptualModelProperty} from "./model/index.ts";

/**
 * Returns all the properties from the conceptual model as a map indexed by
 * PIM iri.
 * @param conceptual Conceptual model
 */
export function buildPropertyMap(conceptual: ConceptualModel) {
  const result: Record<string, [ConceptualModelProperty | null, ConceptualModelProperty | null]> = {};
  for (const entity of Object.values(conceptual.classes)) {
    for (const property of entity.properties) {
      if (!result[property.pimIri]) {
        result[property.pimIri] = [null, null];
      }
      result[property.pimIri][property.isReverse ? 1 : 0] = property;
    }
  }
  return (property: string, isReverse: boolean) => result[property]?.[isReverse ? 1 : 0] ?? null;
}
