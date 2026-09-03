import {ConceptualModel, ConceptualModelPrimitiveType} from "../../conceptual-model/index.ts";
import {StructureModel} from "../model/index.ts";
import {clone} from "@dataspecer/core/core";
import {buildPropertyMap} from "../../conceptual-model/utils.ts";

/**
 * Add regex from {@link ConceptualModel} if they are missing.
 */
export function propagateRegex(
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
    classData.regex = classData.regex ?? conceptualClass.regex ?? null;
    classData.properties.forEach(property => {
      const conceptualProperty = propertyMap(property.pimIri, property.isReverse);
      if (conceptualProperty) {
        for (const dataType of property.dataTypes) {
          if (dataType.isAttribute()) {
            dataType.regex = dataType.regex ?? (conceptualProperty.dataTypes[0] as ConceptualModelPrimitiveType)?.regex ?? null;
          }
        }
      }

    });
  }
  return result;
}
