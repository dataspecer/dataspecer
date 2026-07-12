import {
  coreResourceToEntity,
  createExecutorMap,
  type CoreOperation,
  type CoreOperationAndOperation,
  type CoreOperationExecutor,
  type CoreResource,
  type CoreResourceAndEntity,
  type CoreResourceReader,
} from "../core/index.ts";
import { diffEntities, generateEntityId, type EntityChange, type EntityRecord } from "../entity-model/index.ts";
import { dataPsmExecutors } from "./data-psm-executors.ts";

const structureModelExecutors = createExecutorMap([...dataPsmExecutors]);

/**
 * Applies structure model (PSM) operations to the given entities and returns
 * the net changes between the original and the resulting state. The entities
 * are modified in place.
 *
 * Since the operations are using CoreResource internally, entity types are
 * synced on the operation before execution.
 */
export function applyOperationsToStructureModel(entities: EntityRecord<CoreResourceAndEntity>, operations: CoreOperationAndOperation[]): EntityChange[] {
  const previous: EntityRecord<CoreResourceAndEntity> = { ...entities };
  const working = entities;

  for (const operation of operations) {
    // Since there is an interface mismatch, we need to ensure that the operation is compatible with both interfaces
    operation.id = operation.id ?? operation.iri;
    operation.iri = operation.id;
    operation.types = operation.types ?? (operation.type ? [operation.type] : []);
    operation.type = operation.types[0] ?? "unknown";

    const executor = findExecutor(operation);

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

function findExecutor(operation: CoreOperation): CoreOperationExecutor<CoreOperation> {
  const candidates: CoreOperationExecutor<CoreOperation>[] = [];
  operation.types.forEach((type) => {
    const executor = structureModelExecutors[type];
    if (executor !== undefined) {
      candidates.push(executor);
    }
  });

  if (candidates.length !== 1) {
    throw new Error("Can't determine executor for given operation.");
  }

  return candidates[0];
}
