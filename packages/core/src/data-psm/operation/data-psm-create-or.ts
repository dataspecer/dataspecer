import {CoreOperation, CoreOperationResult, CoreResource, CoreTyped} from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";
import { generateEntityId } from "../../entity-model/entity.ts";

export class DataPsmCreateOr extends CoreOperation {
  static readonly TYPE = PSM.CREATE_OR;

  /**
   * IRI of the newly created object, generated up-front so that callers can
   * use it without depending on the (deprecated) return value of applyOperation.
   */
  dataPsmNewIri: string | null = generateEntityId();

  dataPsmChoices: string[] = [];

  constructor() {
    super();
    this.types.push(DataPsmCreateOr.TYPE);
  }

  static is(resource: CoreResource | null): resource is DataPsmCreateOr {
    return resource?.types.includes(DataPsmCreateOr.TYPE);
  }
}

export class DataPsmCreateOrResult extends CoreOperationResult {
  static readonly TYPE = PSM.CREATE_OR_RESULT;

  readonly createdDataPsmOr: string;

  constructor(dataPsmOr: string) {
    super();
    this.types.push(DataPsmCreateOrResult.TYPE);
    this.createdDataPsmOr = dataPsmOr;
  }

  static is(
    resource: CoreTyped | null
  ): resource is DataPsmCreateOrResult {
    return resource?.types.includes(DataPsmCreateOrResult.TYPE);
  }
}
