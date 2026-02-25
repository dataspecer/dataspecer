import {ConceptualModel, ConceptualModelProperty,} from "../../conceptual-model/index.ts";
import {clone} from "../../core/index.ts";
import {StructureModel} from "../model/index.ts";

/**
 * Add labels from {@link ConceptualModel} if they are missing.
 */
export function propagateLabel(
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
    classData.humanLabel = {
      ...conceptualClass.humanLabel,
      ...classData.humanLabel,
    };
    classData.humanDescription = {
      ...conceptualClass.humanDescription,
      ...classData.humanDescription,
    };
    classData.usageNote = {
      ...conceptualClass.usageNote,
      ...classData.usageNote,
    };
    classData.properties.forEach((property) => {
      const conceptualProperty = propertyMap[property.pimIri]?.[property.isReverse ? 1 : 0];
      if (conceptualProperty) {
        property.humanLabel = {
          ...conceptualProperty?.humanLabel,
          ...property.humanLabel,
        };
        property.humanDescription = {
          ...conceptualProperty?.humanDescription,
          ...property.humanDescription,
        };
        property.usageNote = {
          ...conceptualProperty?.usageNote,
          ...property.usageNote,
        };
      }
    });
  }
  return result;
}

function buildPropertyMap(conceptual: ConceptualModel) {
  const result: Record<string, [ConceptualModelProperty | null, ConceptualModelProperty | null]> = {};
  for (const entity of Object.values(conceptual.classes)) {
    for (const property of entity.properties) {
      if (!result[property.pimIri]) {
        result[property.pimIri] = [null, null];
      }
      result[property.pimIri][property.isReverse ? 1 : 0] = property;
    }
  }
  return result;
}
