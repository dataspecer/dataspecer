import {ConceptualModel, ConceptualModelPrimitiveType} from "../../conceptual-model/index.ts";
import {StructureModel} from "../model/index.ts";
import {clone} from "@dataspecer/core/core";
import {buildPropertyMap} from "../../conceptual-model/utils.ts";

/**
 * Add examples from {@link ConceptualModel} if they are missing.
 */
export function propagateExample(
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
    classData.example = classData.example ?? conceptualClass.example ?? null;
    classData.objectExample = classData.objectExample ?? conceptualClass.objectExample ?? null;
    classData.properties.forEach(property => {
      const conceptualProperty = propertyMap(property.pimIri, property.isReverse);
      if (conceptualProperty) {
        for (const dataType of property.dataTypes) {
          if (dataType.isAttribute()) {
            dataType.example = dataType.example ?? (conceptualProperty.dataTypes[0] as ConceptualModelPrimitiveType)?.example ?? null;
          }
        }
      }

    });
  }
  return result;
}
