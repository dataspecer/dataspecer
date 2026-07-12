import { coreResourceToEntity, type CoreResource, type CoreResourceAndEntity } from "../core/core-resource.ts";
import { coreOperationToOperation, type CoreOperation, type CoreOperationAndOperation } from "../core/operation/core-operation.ts";
import type { EntityRecord } from "../entity-model/index.ts";
import type { ModelIdentifier } from "../model/model.ts";
import { generateOperationId, type Operation } from "../operation/index.ts";
import { DataPsmCreateSchema } from "./operation/data-psm-create-schema.ts";

export interface StructureModelState {
  operations: Operation[];
  entities: EntityRecord<CoreResourceAndEntity>;
}

/**
 * Generates new operations to initialize a structure model.
 */
export function initializeStructureModel(modelId: ModelIdentifier): CoreOperationAndOperation[] {
  const createSchema = new DataPsmCreateSchema();
  createSchema.iri = generateOperationId();
  createSchema.dataPsmNewIri = modelId;
  return [coreOperationToOperation(createSchema)];
}

export function serializationToStructureModelEntities(serialization: unknown): StructureModelState {
  const coreOperations = (serialization as any).operations as CoreOperation[];
  const coreResources = (serialization as any).resources as Record<string, CoreResource>;

  const operations = coreOperations.map(coreOperationToOperation);
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
