import { DataPsmOperationResult } from "./data-psm-operation-result.ts";
import { generateOperationId, type Operation } from "../../operation/index.ts";
import { generateEntityId } from "../../entity-model/entity.ts";
import { LanguageString } from "../../core/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmCreateContainer implements Operation {
  static readonly TYPE = PSM.CREATE_CONTAINER;

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

  dataPsmContainerType: string | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmCreateContainer.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmCreateContainer {
    return operation?.type === DataPsmCreateContainer.TYPE;
  }
}

export class DataPsmCreateContainerResult extends DataPsmOperationResult {
  static readonly TYPE = PSM.CREATE_CONTAINER_RESULT;

  readonly createdDataPsmContainer: string;

  constructor(dataPsmContainer: string) {
    super();
    this.types.push(DataPsmCreateContainerResult.TYPE);
    this.createdDataPsmContainer = dataPsmContainer;
  }

  static is(result: DataPsmOperationResult | null | undefined): result is DataPsmCreateContainerResult {
    return result?.types.includes(DataPsmCreateContainerResult.TYPE) ?? false;
  }
}
