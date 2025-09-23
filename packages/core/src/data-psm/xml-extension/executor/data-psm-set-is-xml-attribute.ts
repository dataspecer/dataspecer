import { CoreExecutorResult, CoreResourceReader, CreateNewIdentifier, } from "../../../core/index.ts";
import { DataPsmExecutorResultFactory } from "../../executor/data-psm-executor-utils.ts";
import { DataPsmAssociationEnd, DataPsmAttribute } from "../../model/index.ts";
import { DataPsmXmlPropertyExtension } from "../model/index.ts";
import { DataPsmSetIsXmlAttribute } from "../operation/index.ts";
import { XML_EXTENSION } from "../vocabulary.ts";

export async function executeDataPsmSetIsXmlAttribute(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetIsXmlAttribute
): Promise<CoreExecutorResult> {
  const resource = await reader.readResource(operation.dataPsmProperty) as DataPsmXmlPropertyExtension;
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
            isAttribute: !!operation.isAttribute,
          }
        }
      } as DataPsmXmlPropertyExtension,
    ]
  );
}
