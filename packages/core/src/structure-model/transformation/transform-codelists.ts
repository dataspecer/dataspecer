import {clone} from "../../core";
import { OFN } from "../../well-known";
import {StructureModel, StructureModelPrimitiveType} from "../model";

/**
 * Transforms codelist into property.
 * @todo rename to transformPrimitiveTypes
 */
export function structureModelTransformCodelists(
  structure: StructureModel
): StructureModel {
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();
  for (const structureClass of classes) {
    for (const property of structureClass.properties) {
      property.dataTypes = property.dataTypes.map(dataType => {
        if (dataType.isAssociation() && dataType.dataType.properties.length === 0 && !dataType.dataType.emptyAsComplex) {
          const dt = new StructureModelPrimitiveType();
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
