import { clone } from "@dataspecer/core/core/index";
import { StructureModelClass } from "@dataspecer/core/structure-model/model/structure-model-class";
import { StructureModelComplexType, StructureModelPrimitiveType } from "@dataspecer/core/structure-model/model/structure-model-type";
import type { XmlStructureModel } from "../xml-structure-model/model/xml-structure-model.ts";
import type { GetReferencedSchema } from "./xml-schema-model-adapter.ts";
import { StructureModelProperty } from "@dataspecer/core/structure-model/model/structure-model-property";
import { getDataPsmXmlGmlType } from "@dataspecer/core/data-psm/xml-extension/model/data-psm-property-extension";
import type { StructureModel } from "@dataspecer/core/structure-model/model/index";

export const DataPsmXmlBoundingShapeType = "http://www.opengis.net/gml/3.2#BoundingShapeType" as const;
export const DataPsmXmlEnvelopeType = "http://www.opengis.net/gml/3.2#EnvelopeType" as const;
export const DataPsmXmlGeometryPropertyType = "http://www.opengis.net/gml/3.2#GeometryPropertyType" as const;

const RDF_GEOSPARQL_GML_LITERAL = "http://www.opengis.net/ont/geosparql#gmlLiteral";
const RDF_GEOSPARQL_WKT_LITERAL = "http://www.opengis.net/ont/geosparql#wktLiteral";
export const XML_GML_NAMESPACE = "http://www.opengis.net/gml/3.2";
const XML_GML_NAMESPACE_PREFIX = "gml";

const XML_TYPE_GML_BOUNDING_SHAPE = XML_GML_NAMESPACE + "#BoundingShapeType";

/**
 * Anything with this prefix has to be treated as a geometry with specific behavior.
 */
const RDF_SF_PREFIX = "http://www.opengis.net/ont/sf#";
const RDF_SF_ENVELOPE = RDF_SF_PREFIX + "Envelope";

/**
 * Returns true for types that should be treated as gml literals.
 */
export function isGmlLiteral(type: string): boolean {
  return type === RDF_GEOSPARQL_GML_LITERAL || // This is RDF geo:gmlLiteral literal type
    type.startsWith(XML_GML_NAMESPACE + "#"); // This is not RDF, this is XML
}

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
    };
  }

  return null;
};

export function structureModelPopulateSfGeometry<T extends StructureModel>(structure: T): T {
  const result = clone(structure) as T;
  const classes = result.getClasses();

  for (const structureClass of classes) {
    for (const property of structureClass.properties) {
      const dataTypes = property.dataTypes;
      for (const dataType of dataTypes) {
        const sfIris = [] as string[];
        if (dataType.isAttribute() && dataType.dataType.startsWith(RDF_SF_PREFIX)) {
          sfIris.push(dataType.dataType);
        } else if (dataType.isAssociation() && dataType.dataType.iris) {
          dataType.dataType.iris.filter((iri) => iri.startsWith(RDF_SF_PREFIX)).forEach((iri) => sfIris.push(iri));
        }

        // This is SF geometry, we need to replace it with different structure!
        if (sfIris.length > 0) {
          const wrappingGeometryClass = new StructureModelClass();
          wrappingGeometryClass.iris = sfIris;
          wrappingGeometryClass.instancesHaveIdentity = "OPTIONAL";
          wrappingGeometryClass.specification = structureClass.specification;
          wrappingGeometryClass.psmIri = sfIris.join("-");

          // region Properties of the wrapping geometry class

          {
            let datatype = RDF_GEOSPARQL_GML_LITERAL;

            if (sfIris.includes(RDF_SF_ENVELOPE)) {
              datatype = XML_TYPE_GML_BOUNDING_SHAPE;
            }

            const gmlType = new StructureModelPrimitiveType();
            gmlType.dataType = datatype;
            const gmlProperty = new StructureModelProperty();
            gmlProperty.technicalLabel = "gml";
            gmlProperty.iris = ["http://www.opengis.net/ont/geosparql#asGML"];
            gmlProperty.cardinalityMax = 1;
            gmlProperty.dataTypes = [gmlType];
            // We need to create new IRI and properly mark profiling info
            gmlProperty.psmIri = property.psmIri + "-gml";
            gmlProperty.profiling = property.profiling.map((p) => p + "-gml");

            wrappingGeometryClass.properties.push(gmlProperty);
          }

          {
            const wktType = new StructureModelPrimitiveType();
            wktType.dataType = RDF_GEOSPARQL_WKT_LITERAL;
            const wktProperty = new StructureModelProperty();
            wktProperty.technicalLabel = "wkt";
            wktProperty.iris = ["http://www.opengis.net/ont/geosparql#asWKT"];
            wktProperty.cardinalityMax = 1;
            wktProperty.dataTypes = [wktType];

            wktProperty.psmIri = property.psmIri + "-wkt";
            wktProperty.profiling = property.profiling.map((p) => p + "-wkt");

            wrappingGeometryClass.properties.push(wktProperty);
          }

          // endregion

          const type = new StructureModelComplexType();
          type.dataType = wrappingGeometryClass;
          property.dataTypes = [type];
        }
      }
    }
  }

  return result;
}

/**
 * Transformation that marks properties with gmlLiteral data type as referencing.
 * This handles the special case where gmlLiteral properties should be treated
 * as object references for proper serialization and API handling.
 */
export function structureModelMarkGmlLiteralAsReferencing(structure: XmlStructureModel): XmlStructureModel {
  const result = clone(structure) as XmlStructureModel;
  const classes = result.getClasses();

  const propertiesFound = [];

  for (const structureClass of classes) {
    for (const property of structureClass.properties) {
      const dataTypes = property.dataTypes;
      if (dataTypes.length === 1 && dataTypes[0].isAttribute() && isGmlLiteral(dataTypes[0].dataType)) {
        property.isReferencing = true;

        let gmlType: string;
        if (dataTypes[0].dataType.startsWith(XML_GML_NAMESPACE + "#")) {
          gmlType = dataTypes[0].dataType.substring((XML_GML_NAMESPACE + "#").length);
        } else {
          const type = getDataPsmXmlGmlType(property.xmlGmlType);
          gmlType = type.substring(type.lastIndexOf("#") + 1);
        }

        const cls = new StructureModelClass();
        cls.isReferenced = true;
        cls.structureSchema = gmlType;
        cls.specification = XML_GML_NAMESPACE;

        propertiesFound.push(cls);

        const type = new StructureModelComplexType();
        type.dataType = cls;
        property.dataTypes = [type];
      }
    }
  }

  return result;
}
