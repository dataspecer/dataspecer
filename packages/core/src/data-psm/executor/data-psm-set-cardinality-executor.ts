import { CoreExecutorResult, CoreResourceReader, CreateNewIdentifier } from "../../core/index.ts";
import { DataPsmAssociationEnd, DataPsmAttribute, DataPsmContainer, DataPsmSchema } from "../model/index.ts";
import { DataPsmSetCardinality } from "../operation/index.ts";
import { DataPsmExecutorResultFactory } from "./data-psm-executor-utils.ts";

type CardinalityType = DataPsmSchema | DataPsmAttribute | DataPsmAssociationEnd | DataPsmContainer;

export async function executeDataPsmSetCardinality(
  reader: CoreResourceReader,
  createNewIdentifier: CreateNewIdentifier,
  operation: DataPsmSetCardinality
): Promise<CoreExecutorResult> {
  const resource = (await reader.readResource(operation.entityId)) as CardinalityType;
  if (!DataPsmSchema.is(resource) && !DataPsmAttribute.is(resource) && !DataPsmAssociationEnd.is(resource) && !DataPsmContainer.is(resource)) {
    return DataPsmExecutorResultFactory.invalidType(resource, "data-psm schema, attribute, container, or association end");
  }

  const modifiedEntity: CardinalityType = {
    ...resource,
    dataPsmCardinality: operation.dataPsmCardinality,
  };

  return CoreExecutorResult.createSuccess([], [modifiedEntity]);
}
