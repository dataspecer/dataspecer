import {StructureModel} from "../model/index.ts";
import {clone} from "@dataspecer/core/core";
import {DataSpecificationConfiguration} from "@dataspecer/core/data-specification/configuration";

export function structureModelAddDefaultValues(
    structure: StructureModel,
    configuration: DataSpecificationConfiguration,
): StructureModel {
    const result = clone(structure) as StructureModel;
    const classes = result.getClasses();
    for (const classData of classes) {
        classData.instancesHaveIdentity ??= configuration.instancesHaveIdentity;
        classData.instancesSpecifyTypes ??= configuration.instancesSpecifyTypes;
        classData.requireRecommendedControlledVocabularyValue ??= configuration.requireRecommendedControlledVocabularyValue;
        classData.restrictToRecommendedControlledVocabulary ??= configuration.restrictToRecommendedControlledVocabulary;
        classData.isClosed ??= configuration.dataPsmIsClosed == "CLOSED";

        // A class without properties may have been turned into the type of an IRI, which has the options of the class.
        for (const property of classData.properties) {
            for (const dataType of property.dataTypes) {
                if (dataType.isAttribute()) {
                    dataType.requireRecommendedControlledVocabularyValue ??= configuration.requireRecommendedControlledVocabularyValue;
                    dataType.restrictToRecommendedControlledVocabulary ??= configuration.restrictToRecommendedControlledVocabulary;
                }
            }
        }
    }
    return result;
}