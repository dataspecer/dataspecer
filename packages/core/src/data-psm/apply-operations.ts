import {
  coreOperationToOperation,
  coreResourceToEntity,
  createExecutorMap,
  type CoreOperationAndOperation,
  type CoreResource,
  type CoreResourceAndEntity,
  type CoreResourceReader,
} from "../core/index.ts";
import { diffEntities, generateEntityId, type EntityChange, type EntityRecord } from "../entity-model/index.ts";
import { dataPsmExecutors } from "./data-psm-executors.ts";

const structureModelExecutors = createExecutorMap([...dataPsmExecutors]);

/**
 * Applies structure model (PSM) operations to the given entities and returns
 * the net changes between the original and the resulting state. The entity
 * record is modified in place.
 */
export function applyOperationsToStructureModel(mutableModel: EntityRecord<CoreResourceAndEntity>, operations: CoreOperationAndOperation[]): EntityChange[] {
  const previous: EntityRecord<CoreResourceAndEntity> = { ...mutableModel };
  const working = mutableModel;

  for (let operation of operations) {
    operation = coreOperationToOperation(operation);

    const executor = structureModelExecutors[operation.type];
    if (executor === undefined) {
      throw new Error(`No executor found for operation type "${operation.type}".`);
    }

    const reader: CoreResourceReader = {
      readResource: (iri: string): CoreResource | null => {
        return (working[iri] as unknown as CoreResource) ?? null;
      },
      listResources: (): string[] => {
        return Object.keys(working);
      },
      listResourcesOfType: (typeIri: string): string[] => {
        return Object.values(working)
          .filter((entity) => entity.type.includes(typeIri))
          .map((entity) => entity.id);
      },
    };

    const executorResult = executor.execute(
      reader,
      (resourceType: string) => {
        console.warn(`Structure model operation executor for "${resourceType}" is using generated identifier, which makes model non-deterministic.`, operation);
        return generateEntityId();
      },
      operation,
    );

    if (executorResult.failed) {
      console.warn("Structure model operation failed: " + executorResult.message, operation);
      continue;
    }

    for (const resource of [...Object.values(executorResult.changed), ...Object.values(executorResult.created)]) {
      // We map core resource to entity and do clone by it
      const entity = coreResourceToEntity(resource);
      working[entity.id] = entity;
    }

    executorResult.deleted.forEach((iri) => delete working[iri]);
  }

  return diffEntities(previous, working);
}
