import { coreResourceToEntity, type CoreResource, type CoreResourceAndEntity } from "../core/core-resource.ts";
import { coreOperationToOperation, type CoreOperation } from "../core/operation/core-operation.ts";
import type { EntityRecord } from "../entity-model/index.ts";
import type { Operation } from "../operation/index.ts";

export interface StructureModelState {
  operations: Operation[];
  entities: EntityRecord<CoreResourceAndEntity>;
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
