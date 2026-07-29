import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import { generateEntityId } from "../../entity-model/entity.ts";
import { LanguageString } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmCreateAssociationEnd implements Operation {
  static readonly TYPE = PSM.CREATE_ASSOCIATION_END;

  id: string;

  type: string;

  /**
   * IRI of the newly created object, generated up-front so that callers can
   * use it without depending on the (deprecated) return value of applyOperation.
   */
  dataPsmNewIri: string | null = generateEntityId();

  dataPsmInterpretation: string | null = null;

  dataPsmTechnicalLabel: string | null = null;

  dataPsmHumanLabel: LanguageString | null = null;

  dataPsmHumanDescription: LanguageString | null = null;

  dataPsmOwner: string | null = null;

  dataPsmPart: string | null = null;

  dataPsmIsReverse: boolean | null = null;

  dataPsmIsDematerialize: boolean | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateAssociationEnd.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateAssociationEnd {
    return operation?.type === DataPsmCreateAssociationEnd.TYPE;
  }
}

export class DataPsmCreateAssociationEndResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_ASSOCIATION_END_RESULT;

  readonly createdDataPsmAssociationEnd: string;

  protected constructor(dataPsmAssociationEnd: string) {
    super();
    this.types.push(DataPsmCreateAssociationEndResult.TYPE);
    this.createdDataPsmAssociationEnd = dataPsmAssociationEnd;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateAssociationEndResult {
    return result?.types.includes(DataPsmCreateAssociationEndResult.TYPE) ?? false;
  }
}
