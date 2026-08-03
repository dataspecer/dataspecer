import { coreResourceToEntity, type CoreResource, type CoreResourceAndEntity } from "../core/core-resource.ts";
import type { EntityRecord } from "../entity-model/index.ts";
import type { ModelIdentifier } from "../model/model.ts";
import { type Operation, type OperationInModel } from "../operation/index.ts";
import { PROJECT_MODEL_ID } from "../project-model/model.ts";
import { createCreateModelOperation } from "../project-model/operations.ts";
import { DataPsmCreateSchema } from "./operation/data-psm-create-schema.ts";

export interface StructureModelState {
  operations: Operation[];
  entities: EntityRecord<CoreResourceAndEntity>;
}

/**
 * Generates new operations to initialize a structure model.
 */
export function createStructureModel(parentPackageId: ModelIdentifier): {
  operations: OperationInModel[],
  modelId: ModelIdentifier,
} {
  const createModel = createCreateModelOperation(parentPackageId, "http://dataspecer.com/resources/v1/psm");
  const modelId = createModel.modelId;

  const createSchema = new DataPsmCreateSchema();
  createSchema.dataPsmNewIri = modelId;

  const operations = [
    {
      operation: createModel,
      modelId: PROJECT_MODEL_ID,
    },
    {
      operation: createSchema,
      modelId: modelId,
    }
  ];

  return {
    operations,
    modelId,
  }
}

export function serializationToStructureModelEntities(serialization: unknown): StructureModelState {
  const operations = (serialization as any).operations as Operation[];
  const coreResources = (serialization as any).resources as Record<string, CoreResource>;

  const entities = Object.fromEntries(Object.entries(coreResources).map(([iri, resource]) => [iri, coreResourceToEntity(resource)])) as EntityRecord<CoreResourceAndEntity>;

  return {
    operations,
    entities,
  };
}

export function structureModelEntitiesToSerialization(state: StructureModelState): unknown {
  // todo we may want to remove original ids and types

  return {
    operations: state.operations,
    resources: state.entities,
  };
}
