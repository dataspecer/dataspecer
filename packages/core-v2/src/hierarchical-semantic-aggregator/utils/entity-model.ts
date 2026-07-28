import type { Entity, EntityChange, EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { LOCAL_SEMANTIC_MODEL } from "../../model/known-models.ts";

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
export function getMainEntity(entities: EntityRecord): Entity | null {
  return Object.values(entities).find((entity) => entity.type?.includes(LOCAL_SEMANTIC_MODEL)) ?? null;
}

export function isMainEntity(entity: Entity): boolean {
  return entity.type?.includes(LOCAL_SEMANTIC_MODEL) ?? false;
}

/**
 * Id of the model is the id of its main entity.
 */
export function getModelId(entities: EntityRecord): string | null {
  return getMainEntity(entities)?.id ?? null;
}

export function getModelAlias(entities: EntityRecord): string | null {
  const mainEntity = getMainEntity(entities) as Record<string, unknown> | null;
  return typeof mainEntity?.["modelAlias"] === "string" ? (mainEntity["modelAlias"] as string) : null;
}

export function getModelBaseIri(entities: EntityRecord): string {
  const mainEntity = getMainEntity(entities) as Record<string, unknown> | null;
  return typeof mainEntity?.["baseIri"] === "string" ? (mainEntity["baseIri"] as string) : "";
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
      if (!isMainEntity(change.next)) {
        updated[change.next.id] = change.next;
      }
    } else if (change.previous && !isMainEntity(change.previous)) {
      removed.push(change.previous.id);
    }
  }
  return [updated, removed];
}
