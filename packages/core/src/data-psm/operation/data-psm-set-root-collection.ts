import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetRootCollection implements Operation {
  static readonly TYPE = PSM.SET_ROOT_COLLECTION;

  id: string;

  type: string;

  entityId: string | null = null;

  dataPsmCollectionTechnicalLabel: string | null = null;

  dataPsmEnforceCollection: boolean = false;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetRootCollection.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetRootCollection {
    return operation?.type === DataPsmSetRootCollection.TYPE;
  }
}
