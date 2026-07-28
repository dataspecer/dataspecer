import { CoreExecutorResult, CoreResourceReader, CreateNewIdentifier } from "../../../core/index.ts";
import { DataPsmExecutorResultFactory } from "../../executor/data-psm-executor-utils.ts";
import { DataPsmAssociationEnd, DataPsmAttribute } from "../../model/index.ts";
import { DataPsmXmlPropertyExtension } from "../model/index.ts";
import { DataPsmSetGmlTypeXmlExtension } from "../operation/index.ts";
import { XML_EXTENSION } from "../vocabulary.ts";

export function executeDataPsmSetGmlTypeXmlExtension(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetGmlTypeXmlExtension
): CoreExecutorResult {
  const resource = reader.readResource(operation.dataPsmProperty) as DataPsmXmlPropertyExtension;
  if (resource == null || (!DataPsmAttribute.is(resource) && !DataPsmAssociationEnd.is(resource))) {
    return DataPsmExecutorResultFactory.invalidType(
      resource,
      "data-psm attribute or association end"
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
            gmlType: operation.gmlType,
          }
        }
      } as DataPsmXmlPropertyExtension,
    ]
  );
}