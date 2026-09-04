import { ConceptualModel } from "../../conceptual-model/index.ts";
import { buildPropertyMap } from "../../conceptual-model/utils.ts";
import { clone } from "@dataspecer/core/core";
import { StructureModel } from "../model/index.ts";

/**
 * Adds CIM iris from {@link ConceptualModel} to {@link StructureModel}.
 * @param conceptual
 * @param structure
 */
export function propagateCimIri(
    conceptual: ConceptualModel,
    structure: StructureModel
): StructureModel {
    const result = clone(structure) as StructureModel;
    const classes = result.getClasses();
    const propertyMap = buildPropertyMap(conceptual);

    // Process classes and extend classes
    for (const classData of classes) {
        const conceptualClass = conceptual.classes[classData.pimIri];
        if (conceptualClass === null || conceptualClass === undefined) {
            continue;
        }
        classData.cimIri = conceptualClass.cimIri;
        classData.iris = conceptualClass.iris;
    }

    // Process properties
    for (const structureClass of classes) {
        structureClass.properties.forEach(
            property => {
                // Find the conceptual property but in non-reverse direction
                // The logic is that it is the reverse property of property with given iri.
                let conceptualProperty = propertyMap(property.pimIri, false);
                if (conceptualProperty) {
                    property.cimIri = conceptualProperty.cimIri;
                    property.iris = conceptualProperty.iris;
                }
            }
        );
    }

    return result;
}
