import { CoreExecutorResult, CoreResourceReader, CreateNewIdentifier, } from "../../../core/index.ts";
import { DataPsmExecutorResultFactory } from "../../executor/data-psm-executor-utils.ts";
import { DataPsmAttribute } from "../../model/index.ts";
import { DataPsmJsonPropertyExtension } from "../model/index.ts";
import { DataPsmSetUseKeyValueForLangString } from "../operation/index.ts";
import { JSON_EXTENSION } from "../vocabulary.ts";

export function executeDataPsmSetUseKeyValueForLangString(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetUseKeyValueForLangString
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmProperty) as DataPsmJsonPropertyExtension;
  if (resource == null || !DataPsmAttribute.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm attribute"
    );
  }
  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        extensions: {
          ...resource?.extensions,
          [JSON_EXTENSION]: {
            ...resource?.extensions?.[JSON_EXTENSION],
            useKeyValueForLangString: !!operation.useKeyValueForLangString,
          }
        }
      } as DataPsmJsonPropertyExtension,
    ]
  );
}
