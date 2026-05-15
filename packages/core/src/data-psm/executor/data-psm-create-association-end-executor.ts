import {
  CoreResourceReader,
  CreateNewIdentifier,
  CoreExecutorResult,
  CoreResource,
} from "../../core/index.ts";
import { DataPsmCreateAssociationEnd } from "../operation/index.ts";
import {
  DataPsmExecutorResultFactory,
  loadDataPsmClass,
  loadDataPsmSchema,
} from "./data-psm-executor-utils.ts";
import { DataPsmAssociationEnd, DataPsmClass } from "../model/index.ts";

export function executeDataPsmCreateAssociationEnd(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmCreateAssociationEnd
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const owner = loadDataPsmClass(reader, operation.dataPsmOwner);
  if (owner === null) {
    return DataPsmExecutorResultFactory.missingOwner(operation.dataPsmOwner);
  }

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("association");
  const result = new DataPsmAssociationEnd(iri);
  result.dataPsmHumanLabel = operation.dataPsmHumanLabel;
  result.dataPsmHumanDescription = operation.dataPsmHumanDescription;
  result.dataPsmInterpretation = operation.dataPsmInterpretation;
  result.dataPsmTechnicalLabel = operation.dataPsmTechnicalLabel;
  result.dataPsmPart = operation.dataPsmPart;
  result.dataPsmIsReverse = operation.dataPsmIsReverse;
  result.dataPsmIsDematerialize = operation.dataPsmIsDematerialize;

  return CoreExecutorResult.createSuccess(
    [result],
    [
      {
        ...schema,
        dataPsmParts: [...schema.dataPsmParts, iri],
      } as CoreResource,
      {
        ...owner,
        dataPsmParts: [...owner.dataPsmParts, iri],
      } as DataPsmClass,
    ]
  );
}
