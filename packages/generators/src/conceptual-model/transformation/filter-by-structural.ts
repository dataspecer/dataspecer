import {ConceptualModel, ConceptualModelClass} from "../model/index.ts";
import {StructureModel} from "../../structure-model/model/index.ts";
import {clone} from "@dataspecer/core/core";
import {structureModelFlattenInheritance} from "../../structure-model/transformation/index.ts";

/**
 * Removes all entities from the conceptual model that are not used in the
 * structure model.
 * @param conceptualModel
 * @param structuralModels
 */
export function filterByStructural(
    conceptualModel: ConceptualModel,
    structuralModels: StructureModel[],
): ConceptualModel {
    conceptualModel = clone(conceptualModel);

    // Apply necessary transformations to simplify the model
    structuralModels = structuralModels.map(structureModelFlattenInheritance);

    const usedPimEntities = new Set<string>([
        ...structuralModels.map(structureModel => structureModel.getClasses()).flat().map(c => c.pimIri),
        ...structuralModels.map(structureModel => structureModel.getClasses()).flat().map(c => c.properties).flat().map(p => p.pimIri),
    ]);

    // We need to add all parents of those base entities
    for (const conceptualModelClassIri of Object.keys(conceptualModel.classes)) {
        if (usedPimEntities.has(conceptualModel.classes[conceptualModelClassIri].pimIri)) {
            const allExtends = ConceptualModelClass.getAllExtends(conceptualModel.classes[conceptualModelClassIri]);
            allExtends.map(c => c.pimIri).forEach(pimIri => usedPimEntities.add(pimIri));
        }
    }

    // Add both classes if there is an association between them that is used
    for (const conceptualModelClassIri of Object.keys(conceptualModel.classes)) {
        for (const property of conceptualModel.classes[conceptualModelClassIri].properties) {
            if (usedPimEntities.has(property.pimIri)) {
                usedPimEntities.add(conceptualModelClassIri);
                if (property.dataTypes.length > 0 && property.dataTypes[0].isAssociation()) {
                    usedPimEntities.add(property.dataTypes[0].pimClassIri);
                }
            }
        }
    }

    // Filter classes
    for (const conceptualModelClassIri of Object.keys(conceptualModel.classes)) {
        if (!usedPimEntities.has(conceptualModel.classes[conceptualModelClassIri].pimIri)) {
            delete conceptualModel.classes[conceptualModelClassIri];
        }
    }

    // Filter properties and extends
    for (const conceptualModelClass of Object.values(conceptualModel.classes)) {
        conceptualModelClass.extends = conceptualModelClass.extends.filter(c => usedPimEntities.has(c.pimIri));
        // Either the property is known, or the class on the other side is known
        conceptualModelClass.properties = conceptualModelClass.properties.filter(p =>
            usedPimEntities.has(p.pimIri) ||
            (p.dataTypes[0] && p.dataTypes[0].isAssociation() && usedPimEntities.has(p.dataTypes[0].pimClassIri)));
    }

    return conceptualModel;
}
