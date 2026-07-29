import { coreResourceToEntity, type CoreResource, type CoreResourceAndEntity } from "../core/core-resource.ts";
import type { EntityRecord } from "../entity-model/index.ts";
import type { ModelIdentifier } from "../model/model.ts";
import { type Operation } from "../operation/index.ts";
import { DataPsmCreateSchema } from "./operation/data-psm-create-schema.ts";

export interface StructureModelState {
  operations: Operation[];
  entities: EntityRecord<CoreResourceAndEntity>;
}

/**
 * Generates new operations to initialize a structure model.
 */
export function initializeStructureModel(modelId: ModelIdentifier): Operation[] {
  const createSchema = new DataPsmCreateSchema();
  createSchema.dataPsmNewIri = modelId;
  return [createSchema];
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
