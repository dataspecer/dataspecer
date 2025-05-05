import {DataPsmSchema} from "../../model/index.ts";
import {XML_EXTENSION} from "../vocabulary.ts";

class XmlSchemaExtension {
  namespace: string | null = null;
  namespacePrefix: string | null = null;
  skipRootElement: boolean | null = false;
}

export class DataPsmSchemaXmlExtension extends DataPsmSchema {
  declare extensions?: {
    string: object;
    [XML_EXTENSION]?: Partial<XmlSchemaExtension>
  }

  static getExtensionData(schema: DataPsmSchemaXmlExtension): XmlSchemaExtension {
    const data = new XmlSchemaExtension();
    Object.assign(data, schema?.extensions?.[XML_EXTENSION]);
    return data;
  }
}
