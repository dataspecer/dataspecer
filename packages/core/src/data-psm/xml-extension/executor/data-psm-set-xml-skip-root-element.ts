import {CoreExecutorResult, CoreResourceReader, CreateNewIdentifier,} from "../../../core/index.ts";
import {DataPsmSchema} from "../../model/index.ts";
import {DataPsmExecutorResultFactory} from "../../executor/data-psm-executor-utils.ts";
import {DataPsmSetXmlSkipRootElement} from "../operation/index.ts";
import {DataPsmSchemaXmlExtension} from "../model/index.ts";
import {XML_EXTENSION} from "../vocabulary.ts";

export function executeDataPsmSetXmlSkipRootElement(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetXmlSkipRootElement
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmSchema);
  if (resource == null || !DataPsmSchema.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm schema"
    );
  }
  return CoreExecutorResult.createSuccess(
    [],
    [
      {
        ...resource,
        extensions: {
          ...resource?.extensions,
          [XML_EXTENSION]: {
            ...resource?.extensions?.[XML_EXTENSION],
            skipRootElement: operation.skipRootElement,
          }
        }
      } as DataPsmSchemaXmlExtension,
    ]
  );
}
