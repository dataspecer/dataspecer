import { clone } from "@dataspecer/core/core/index";
import { StructureModelClass } from "@dataspecer/core/structure-model/model/structure-model-class";
import { StructureModelComplexType } from "@dataspecer/core/structure-model/model/structure-model-type";
import type { XmlStructureModel } from "../xml-structure-model/model/xml-structure-model.ts";
import type { GetReferencedSchema } from "./xml-schema-model-adapter.ts";

const RDF_GEOSPARQL_GML_LITERAL = "http://www.opengis.net/ont/geosparql#gmlLiteral";
const XML_GML_NAMESPACE = "http://www.opengis.net/gml/3.2";
const XML_GML_NAMESPACE_PREFIX = "gml";

/**
 * Function that retrieves import information in case GML is referenced. If no,
 * null is returned and other functions should handle it as usual.
 */
export const GetReferencedSchemaForGml: GetReferencedSchema = (structureId: string, specificationId: string) => {
  if (specificationId === XML_GML_NAMESPACE) {
    return {
      typeName: structureId, // For this specification we have a rule that type name is the same as structureId
      namespace: XML_GML_NAMESPACE,
      namespacePrefix: XML_GML_NAMESPACE_PREFIX,
      publicUrl: "https://schemas.opengis.net/gml/3.2.1/gml.xsd",
    }
  }

  return null;
}

/**
 * Transformation that marks properties with gmlLiteral data type as referencing.
 * This handles the special case where gmlLiteral properties should be treated
 * as object references for proper serialization and API handling.
 */
export function structureModelMarkGmlLiteralAsReferencing(
  structure: XmlStructureModel
): XmlStructureModel {
  const result = clone(structure) as XmlStructureModel;
  const classes = result.getClasses();

  for (const structureClass of classes) {
    for (const property of structureClass.properties) {
      const dataTypes = property.dataTypes;
      if (dataTypes.length === 1 &&
        dataTypes[0].isAttribute() &&
        dataTypes[0].dataType === RDF_GEOSPARQL_GML_LITERAL) {
        property.isReferencing = true;

        const cls = new StructureModelClass();
        cls.isReferenced = true;
        cls.structureSchema = "GeometryPropertyType";
        cls.specification = XML_GML_NAMESPACE;

        const type = new StructureModelComplexType();
        type.dataType = cls;
        property.dataTypes = [type];
      }
    }
  }

  return result;
}
