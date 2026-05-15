import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmWrapWithOr, DataPsmWrapWithOrResult,} from "../operation/index.ts";
import {DataPsmExecutorResultFactory, loadDataPsmSchema,} from "./data-psm-executor-utils.ts";
import {DataPsmOr, DataPsmSchema} from "../model/index.ts";
import {replaceObjectInSchema} from "./replace-object-in-schema.ts";

export function executeDataPsmWrapWithOr(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmWrapWithOr
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);
  if (schema === null) {
    return DataPsmExecutorResultFactory.missingSchema();
  }

  const iri = operation.dataPsmNewIri ?? createNewIdentifier("or");

  const changed = replaceObjectInSchema(schema.iri, operation.dataPsmChild, iri, reader);

  const result = new DataPsmOr(iri);
  result.dataPsmChoices = [operation.dataPsmChild];

  const changedSchema = changed.some(c => c.iri === schema.iri);
  if (changedSchema) {
    changed.map(c => c.iri === schema.iri ? {...c, dataPsmParts: (c as DataPsmSchema).dataPsmParts = [...(c as DataPsmSchema).dataPsmParts, iri]} : c);
  } else {
    changed.push({...schema, dataPsmParts: schema.dataPsmParts = [...schema.dataPsmParts, iri]} as DataPsmSchema);
  }

  return CoreExecutorResult.createSuccess(
    [result],
    changed,
    [],
    new DataPsmWrapWithOrResult(iri)
  );
}
