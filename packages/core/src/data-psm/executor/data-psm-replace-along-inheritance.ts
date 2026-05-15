import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../core/index.ts";
import {DataPsmReplaceAlongInheritance} from "../operation/index.ts";
import {DataPsmExecutorResultFactory, loadDataPsmSchema,} from "./data-psm-executor-utils.ts";
import {DataPsmClass} from "../model/index.ts";
import {replaceObjectInSchema} from "./replace-object-in-schema.ts";

export function executeDataPsmReplaceAlongInheritance(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmReplaceAlongInheritance
): CoreExecutorResult {
  const schema = loadDataPsmSchema(reader);

  const originalResource = reader.readResource(
    operation.dataPsmOriginalClass
  );
  if (originalResource === null) {
    return DataPsmExecutorResultFactory.missing(
      operation.dataPsmOriginalClass
    );
  }
  if (!DataPsmClass.is(originalResource)) {
    return DataPsmExecutorResultFactory.invalidType(
      originalResource,
      "data-psm-class"
    );
  }

  const replacingResource = reader.readResource(
    operation.dataPsmReplacingClass
  );
  if (replacingResource === null) {
    return DataPsmExecutorResultFactory.missing(
      operation.dataPsmReplacingClass
    );
  }
  if (!DataPsmClass.is(replacingResource)) {
    return DataPsmExecutorResultFactory.invalidType(
      replacingResource,
      "data-psm-class"
    );
  }

  if (replacingResource.dataPsmParts.length > 0) {
    return CoreExecutorResult.createError(
      "Replacing resource must not have any parts"
    );
  }

  // todo is replacingResource a subtype or supertype of originalResource

  // todo are all parts valid under the new replacingResource

  // No collisions with other entities
  const changed = replaceObjectInSchema(
    schema.iri,
    operation.dataPsmOriginalClass,
    operation.dataPsmReplacingClass,
    reader);

  return CoreExecutorResult.createSuccess(
    [],
    [
      ...changed,
      {
        ...originalResource,
        dataPsmParts: [],
      } as DataPsmClass,
      {
        ...replacingResource,
        dataPsmParts: originalResource.dataPsmParts,
      } as DataPsmClass,
    ]
  );
}
