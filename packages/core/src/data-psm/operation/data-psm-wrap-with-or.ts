import {CoreOperation, CoreOperationResult, CoreResource, CoreTyped} from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

/**
 * Wraps {@link DataPsmClass}, {@link DataPsmClassReference} or
 * {@link DataPsmOr} into newly created {@link DataPsmOr}
 */
export class DataPsmWrapWithOr extends CoreOperation {
  static readonly TYPE = PSM.WRAP_WITH_OR;

  /**
   * IRI of the newly created DataPsmOr
   */
  dataPsmNewIri: string | null = null;

  /**
   * The wrapped resource
   */
  dataPsmChild: string | null = null;

  constructor() {
    super();
    this.types.push(DataPsmWrapWithOr.TYPE);
  }

  static is(resource: CoreResource | null): resource is DataPsmWrapWithOr {
    return resource?.types.includes(DataPsmWrapWithOr.TYPE);
  }
}

export class DataPsmWrapWithOrResult extends CoreOperationResult {
  static readonly TYPE = PSM.WRAP_WITH_OR_RESULT;

  readonly createdDataPsmOr: string;

  constructor(dataPsmOr: string) {
    super();
    this.types.push(DataPsmWrapWithOrResult.TYPE);
    this.createdDataPsmOr = dataPsmOr;
  }

  static is(
    resource: CoreTyped | null
  ): resource is DataPsmWrapWithOrResult {
    return resource?.types.includes(DataPsmWrapWithOrResult.TYPE);
  }
}
