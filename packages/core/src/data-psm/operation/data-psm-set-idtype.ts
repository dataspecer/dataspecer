import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

/**
 * Overrides default @id and @type settings for JSON generators
 */
export class DataPsmSetIdType implements Operation {
  static readonly TYPE = PSM.SET_ID_TYPE;

  id: string;

  type: string;

  entityId: string | null = null;

  /**
   * Key of property representing ID of the entity.
   * If set to null, the property won't be used.
   * If set to undefined, the default value will be used.
   */
  jsonIdKeyAlias: string | null | undefined = undefined;

  /**
   * Whether the property @id is required.
   * If set to undefined, the default value will be used.
   */
  jsonIdRequired: boolean | undefined = undefined;

  /**
   * Key of property representing the type of the entity.
   * If set to null, the property won't be used.
   * If set to undefined, the default value will be used.
   */
  jsonTypeKeyAlias: string | null | undefined = undefined;

  /**
   * Whether the property @type is required.
   * If set to undefined, the default value will be used.
   */
  jsonTypeRequired: boolean | undefined = undefined;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetIdType.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetIdType {
    return operation?.type === DataPsmSetIdType.TYPE;
  }
}
