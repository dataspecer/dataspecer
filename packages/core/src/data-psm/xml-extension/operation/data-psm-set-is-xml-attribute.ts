import { generateOperationId, type Operation } from "../../../operation/index.ts";
import {SET_IS_XML_ATTRIBUTE} from "../vocabulary.ts";

export class DataPsmSetIsXmlAttribute implements Operation {
  static readonly TYPE = SET_IS_XML_ATTRIBUTE;

  id: string;

  type: string;

  entityId: string | null = null;

  isAttribute: boolean = true;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetIsXmlAttribute.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetIsXmlAttribute {
    return operation?.type === DataPsmSetIsXmlAttribute.TYPE;
  }
}
