import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { getSemanticModelMainEntity, isMainSemanticModelEntity } from "../../semantic-model/concepts/index.ts";

/**
 * Simplified model used across the hierarchical semantic aggregator.
 *
 * Unlike the old {@link InMemorySemanticModel}, this model does not execute
 * operations on its own and does not return anything from
 * {@link executeOperation}. Operations are sent away (for example to a
 * federated store) and the model only learns about their effect once the
 * resulting changes are observed through {@link subscribeToChanges}. If the id
 * of a newly created entity is needed, generate it before constructing the
 * operation (see operation factories such as {@link createClass} or
 * {@link createClassProfile}) instead of relying on a return value here.
 *
 * @todo maybe move it to the core
 */
export interface EntityModel {
  getEntities(): EntityRecord;
  subscribeToChanges(callback: (changes: EntityChange[]) => void): void;
  executeOperation(operation: Operation | any): void;
}

/**
 * Entities of a semantic model contain, besides the regular semantic entities,
 * exactly one special entity of type {@link LOCAL_SEMANTIC_MODEL} that
 * describes the model itself, for example its alias and base IRI. As this is a
 * regular entity, it can change like any other entity, therefore it must always
 * be read from the current entities instead of being cached somewhere.
 */
/**
 * Id of the model is the id of its main entity.
 */
export function getModelId(entities: EntityRecord): string | null {
  return getSemanticModelMainEntity(entities)?.id ?? null;
}

export function getModelAlias(entities: EntityRecord): string | null {
  const alias = getSemanticModelMainEntity(entities)?.modelAlias;
  return typeof alias === "string" ? alias : null;
}

export function getModelBaseIri(entities: EntityRecord): string {
  const baseIri = getSemanticModelMainEntity(entities)?.baseIri;
  return typeof baseIri === "string" ? baseIri : "";
}

/**
 * Converts a list of entity changes to the older "updated"/"removed" shape,
 * ignoring the main entity describing the model.
 */
export function splitEntityChanges(changes: EntityChange[]): [updated: Record<string, Entity>, removed: string[]] {
  const updated: Record<string, Entity> = {};
  const removed: string[] = [];
  for (const change of changes) {
    if (change.next) {
      if (!isMainSemanticModelEntity(change.next)) {
        updated[change.next.id] = change.next;
      }
    } else if (change.previous && !isMainSemanticModelEntity(change.previous)) {
      removed.push(change.previous.id);
    }
  }
  return [updated, removed];
}
