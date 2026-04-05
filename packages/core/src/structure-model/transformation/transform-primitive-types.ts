import {clone} from "../../core/index.ts";
import { OFN } from "../../well-known/index.ts";
import {StructureModel, StructureModelPrimitiveType} from "../model/index.ts";

/**
 * Transforms primitive types into property.
 */
export function structureModelTransformPrimitiveTypes(
  structure: StructureModel
): StructureModel {
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();
  for (const structureClass of classes) {
    for (const property of structureClass.properties) {
      property.dataTypes = property.dataTypes.map(dataType => {
        if (dataType.isAssociation() && !property.isInOr && dataType.dataType.properties.length === 0 && !dataType.dataType.emptyAsComplex) {
          const dt = new StructureModelPrimitiveType();
          dt.typeOfIds = dataType.dataType.iris;
          dt.dataType = OFN.url;
          dt.regex = dataType.dataType.regex;
          dt.example = dataType.dataType.example;
          return dt;
        }
        return dataType;
      });
    }
  }
  return result;
}
