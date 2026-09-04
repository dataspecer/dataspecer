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
        classData.isClosed ??= configuration.dataPsmIsClosed == "CLOSED";
    }
    return result;
}