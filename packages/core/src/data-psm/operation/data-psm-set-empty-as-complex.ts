import { generateOperationId, type Operation } from "../../operation/index.ts";
import * as PSM from "../data-psm-vocabulary.ts";

export class DataPsmSetEmptyAsComplex implements Operation {
  static readonly TYPE = PSM.SET_EMPTY_AS_COMPLEX;

  id: string;

  type: string;

  entityId: string | null = null;

  dataPsmEmptyAsComplex: boolean | null = null;

  constructor() {
    this.id = generateOperationId();
    this.type = DataPsmSetEmptyAsComplex.TYPE;
  }

  static is(operation: Operation | null | undefined): operation is DataPsmSetEmptyAsComplex {
    return operation?.type === DataPsmSetEmptyAsComplex.TYPE;
  }
}