import {StructureModel} from "@dataspecer/core/structure-model/model";
import {XmlStructureModel} from "./model/xml-structure-model.ts";
import {CoreResourceReader} from "@dataspecer/core/core";
import {DataPsmSchema} from "@dataspecer/core/data-psm/model";
import {DataPsmSchemaXmlExtension} from "@dataspecer/core/data-psm/xml-extension/model";

/**
 * Transforms structure model to XML structure model by adding properties from
 * PSM specific to XML.
 * @param structure
 * @param reader
 */
export function structureModelAddXmlProperties(
  structure: StructureModel,
  reader: CoreResourceReader,
): XmlStructureModel {
  const result = Object.assign(new XmlStructureModel(), structure);
  const schema = reader.readResource(structure.psmIri);

  if (!schema || !DataPsmSchema.is(schema)) {
    throw new Error(`Entity is not a PSM schema '${structure.psmIri}'.`);
  }

  const data = DataPsmSchemaXmlExtension.getExtensionData(schema);

  result.namespace = data.namespace;
  result.namespacePrefix = data.namespacePrefix;
  result.skipRootElement = data.skipRootElement === true;

  return result;
}
