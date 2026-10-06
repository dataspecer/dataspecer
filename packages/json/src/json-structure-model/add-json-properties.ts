import {StructureModel} from "@dataspecer/generators/structure-model/model";
import {clone, CoreResourceReader} from "@dataspecer/core/core";
import {DataPsmClass} from "@dataspecer/core/data-psm/model";
import {JsonStructureModelClass} from "./structure-model-class.ts";

export async function structureModelAddJsonProperties(
  structure: StructureModel,
  reader: CoreResourceReader,
): Promise<StructureModel> {
  const result = clone(structure) as StructureModel;

  const classes = result.getClasses();
  for (const structureClass of classes) {
    const jsonStructureClass = structureClass as JsonStructureModelClass;
    const resource = await reader.readResource(structureClass.psmIri) as DataPsmClass;

    jsonStructureClass.jsonIdKeyAlias = resource.jsonIdKeyAlias;
    jsonStructureClass.jsonIdRequired = resource.jsonIdRequired;
    jsonStructureClass.jsonTypeKeyAlias = resource.jsonTypeKeyAlias;
    jsonStructureClass.jsonTypeRequired = resource.jsonTypeRequired;
  }

  return result;
}
