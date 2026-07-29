import { generateOperationId, type Operation } from "../../../operation/index.ts";
import { SET_GML_TYPE } from "../vocabulary.ts";

export class DataPsmSetGmlTypeXmlExtension implements Operation {
  static readonly TYPE = SET_GML_TYPE;

  id: string;

  type: string;

  dataPsmProperty: string | null = null;

  gmlType: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetGmlTypeXmlExtension.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetGmlTypeXmlExtension {
    return operation?.type === DataPsmSetGmlTypeXmlExtension.TYPE;
  }
}