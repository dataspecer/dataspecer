import type { EntityRecord } from "../entity-model/index.ts";
import type { ModelIdentifier, ModelMetadata } from "../model/index.ts";
import { DataPsmSchema } from "./model/index.ts";

export function getStructureModelMetadata(entities: EntityRecord, modelId: ModelIdentifier): ModelMetadata | null {
  const mainEntity = entities[modelId];
  if (!mainEntity || !DataPsmSchema.is(mainEntity)) {
    return null;
  }
  return {
    label: mainEntity.dataPsmHumanLabel ?? {},
    description: mainEntity.dataPsmHumanDescription ?? {},
  };
}
