import { generateOperationId, type Operation } from "../../../operation/index.ts";
import {SET_SKIP_ROOT_ELEMENT} from "../vocabulary.ts";

export class DataPsmSetXmlSkipRootElement implements Operation {
  static readonly TYPE = SET_SKIP_ROOT_ELEMENT;

  id: string;

  type: string;

  entityId: string | null = null;

  skipRootElement: boolean | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetXmlSkipRootElement.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetXmlSkipRootElement {
    return operation?.type === DataPsmSetXmlSkipRootElement.TYPE;
  }
}
