import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

/**
 * Replaces data PSM class with another class that is ancestor or descendant of
 * the original class. Preserves the original class associations and attributes.
 *
 * Operation does not remove the original class.
 */
export class DataPsmReplaceAlongInheritance implements Operation {
  static readonly TYPE = PSM.REPLACE_ALONG_INHERITANCE;

  id: string;

  type: string;

  dataPsmOriginalClass: string | null = null;

  dataPsmReplacingClass: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmReplaceAlongInheritance.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmReplaceAlongInheritance {
    return operation?.type === DataPsmReplaceAlongInheritance.TYPE;
  }
}
