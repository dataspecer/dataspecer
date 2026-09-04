import {ConceptualModel,} from "../../conceptual-model/index.ts";
import {StructureModel} from "../model/index.ts";
import {clone} from "@dataspecer/core/core";
import {buildPropertyMap} from "../../conceptual-model/utils.ts";

/**
 * Add cardinalities from {@link ConceptualModel} if they are missing.
 */
export function propagateCardinality(
  conceptual: ConceptualModel,
  structure: StructureModel
): StructureModel {
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();
  const propertyMap = buildPropertyMap(conceptual);
  for (const classData of classes) {
    const conceptualClass = conceptual.classes[classData.pimIri];
    if (conceptualClass === null || conceptualClass === undefined) {
      continue;
    }
    classData.properties.forEach(property => {
      const conceptualProperty = propertyMap(property.pimIri, property.isReverse);
      if (conceptualProperty) {
        property.cardinalityMin =
          property.cardinalityMin ?? conceptualProperty.cardinalityMin ?? 0;
        property.cardinalityMax =
          property.cardinalityMax ?? conceptualProperty.cardinalityMax ?? null;
      }
    });
  }
  return result;
}
