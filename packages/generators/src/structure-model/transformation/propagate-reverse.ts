import {ConceptualModel} from "../../conceptual-model/index.ts";
import {StructureModel} from "../model/index.ts";
import {clone} from "@dataspecer/core/core";
import {buildPropertyMap} from "../../conceptual-model/utils.ts";

/**
 * Adds information whether the association is reversed or not.
 * @param conceptual
 * @param structure
 */
export function propagateReverse(
  conceptual: ConceptualModel,
  structure: StructureModel
): StructureModel {
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();
  const propertyMap = buildPropertyMap(conceptual);

  // Process properties
  for (const structureClass of classes) {
    const conceptualClass = conceptual.classes[structureClass.pimIri];

    structureClass.properties.forEach(
      property => {
        // Class and property must be interpreted
        if (!conceptualClass || !property.pimIri) {
          property.isReverse = false;
          return;
        }

        const conceptualProperty = propertyMap(property.pimIri, property.isReverse);
        if (conceptualProperty) {
          property.isReverse = conceptualProperty.isReverse;
        }
      }
    );
  }

  return result;
}
