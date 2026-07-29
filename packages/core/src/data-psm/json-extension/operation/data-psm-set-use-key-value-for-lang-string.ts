import { generateOperationId, type Operation } from "../../../operation/index.ts";
import {SET_USE_KEY_VALUE_FOR_LANG_STRING} from "../vocabulary.ts";

export class DataPsmSetUseKeyValueForLangString implements Operation {
  static readonly TYPE = SET_USE_KEY_VALUE_FOR_LANG_STRING;

  id: string;

  type: string;

  dataPsmProperty: string | null = null;

  useKeyValueForLangString: boolean = false;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetUseKeyValueForLangString.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetUseKeyValueForLangString {
    return operation?.type === DataPsmSetUseKeyValueForLangString.TYPE;
  }
}
