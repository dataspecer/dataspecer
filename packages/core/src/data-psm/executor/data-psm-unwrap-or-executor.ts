import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmUnwrapOr, DataPsmUnwrapOrResult,} from "../operation/index.ts";
import {DataPsmExecutorResultFactory, loadDataPsmSchema,} from "./data-psm-executor-utils.ts";
import {DataPsmOr, DataPsmSchema} from "../model/index.ts";
import {replaceObjectInSchema} from "./replace-object-in-schema.ts";

export function executeDataPsmUnwrapOr(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmUnwrapOr
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const or = reader.readResource(operation.dataPsmOr) as DataPsmOr;
  if (or.dataPsmChoices.length === 0) {
    return CoreExecutorResult.createError("Data-psm or does not have any choice.");
  }
  if (or.dataPsmChoices.length > 1) {
    return CoreExecutorResult.createError("Data-psm or has multiple choices.");
  }
  const replacementIri = or.dataPsmChoices[0];

  const changed = replaceObjectInSchema(schema.iri, operation.dataPsmOr, replacementIri, reader);

  const changedSchema = changed.some(c => c.iri === schema.iri);
  if (changedSchema) {
    changed.map(c => c.iri === schema.iri ? {...c, dataPsmParts: (c as DataPsmSchema).dataPsmParts.filter(p => p !== operation.dataPsmOr)} : c);
  } else {
    changed.push({...schema, dataPsmParts: schema.dataPsmParts.filter(p => p !== operation.dataPsmOr)} as DataPsmSchema);
  }

  return CoreExecutorResult.createSuccess(
    [],
    changed,
    [operation.dataPsmOr],
    new DataPsmUnwrapOrResult()
  );
}
