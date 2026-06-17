import { DataPsmResource } from "../../model/index.ts";
import { XML_EXTENSION } from "../vocabulary.ts";

export const DataPsmXmlBoundingShapeType = "http://www.opengis.net/gml/3.2#BoundingShapeType" as const;
export const DataPsmXmlEnvelopeType = "http://www.opengis.net/gml/3.2#EnvelopeType" as const;
export const DataPsmXmlGeometryPropertyType = "http://www.opengis.net/gml/3.2#GeometryPropertyType" as const;

export const DataPsmXmlGmlTypes = [
  DataPsmXmlBoundingShapeType,
  DataPsmXmlEnvelopeType,
  DataPsmXmlGeometryPropertyType,
] as const;

export function getDataPsmXmlGmlType(type: string | null): typeof DataPsmXmlGmlTypes[number] {
  if (DataPsmXmlGmlTypes.includes(type as any)) {
    return type as any;
  }
  return DataPsmXmlGeometryPropertyType; // Default value
}

class XmlPropertyExtension {
  isAttribute: boolean = false;

  /**
   * In case the property is of type geo:gmlLiteral, you need to select the XML
   * type of the literal. Currently there are three options. Full iri is
   * expected, e.g. "http://www.opengis.net/gml/3.2#GeometryPropertyType".
   *  - gml:BoundingShapeType - inside must be <gml:Envelope>
   *  - gml:EnvelopeType - this in unwrapped <gml:Envelope>
   *  - gml:GeometryPropertyType - inside must be a geometry element, e.g.
   *    <gml:Point>, <gml:Polygon>, etc.
   *  - there is no unwrapped option for GeometryPropertyType as you would not
   *    know which geometry element to expect.
   *
   * This value has no meaning for non-geo:gmlLiteral properties. For
   * geo:gmlLiteral properties, if null, gml:GeometryPropertyType is assumed.
   */
  gmlType: string | null = null;
}

export class DataPsmXmlPropertyExtension extends DataPsmResource {
  declare extensions?: {
    string: object;
    [XML_EXTENSION]?: Partial<XmlPropertyExtension>
  }

  static getExtensionData(property: DataPsmXmlPropertyExtension): XmlPropertyExtension {
    const data = new XmlPropertyExtension();
    Object.assign(data, property?.extensions?.[XML_EXTENSION]);
    return data;
  }
}
