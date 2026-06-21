import { type Entity, type EntityIdentifier } from "../entity-model/entity.ts";
import { generateOperationId, type Operation } from "./operation.ts";

/**
 * @see {@link RemoveEntityOperation}
 */
export const RemoveEntityOperationType = "http://dataspecer.com/core/operation/remove-entity" as const;

/**
 * Operation that ensures that an entity is removed from the model. If the
 * entity does not exist or was already removed, the operation is ignored.
 *
 * This is a low level operation that has no semantics and is not aware of any
 * relations between entities or other consequences of the removal.
 */
export interface RemoveEntityOperation extends Operation {
  type: typeof RemoveEntityOperationType;

  /**
   * Entity to be removed by its identifier.
   */
  entityId: EntityIdentifier;
}

export function createRemoveEntityOperation(entityId: EntityIdentifier): RemoveEntityOperation {
  return {
    id: generateOperationId(),
    type: RemoveEntityOperationType,
    entityId,
  };
}

/**
 * @see {@link SetEntityOperation}
 */
export const SetEntityOperationType = "http://dataspecer.com/core/operation/set-entity" as const;

/**
 * Operation that ensures that an entity is set in the model with the given
 * state. This effectively crates the entity or updates it as a whole if it
 * already exists.
 *
 * This is a low level operation that has no semantics and is not aware of any
 * potential implications of the change.
 */
export interface SetEntityOperation extends Operation {
  type: typeof SetEntityOperationType;

  /**
   * Entity to be set as is in the model.
   */
  entity: Entity;
}

export function createSetEntityOperation(entity: Entity): SetEntityOperation {
  return {
    id: generateOperationId(),
    type: SetEntityOperationType,
    entity,
  };
}

export function isSetEntityOperation(operation: Operation): operation is SetEntityOperation {
  return operation.type === SetEntityOperationType;
}

/**
 * @see {@link UpdateEntityOperation}
 */
export const UpdateEntityOperationType = "http://dataspecer.com/core/operation/update-entity" as const;

/**
 * Operation that ensures that an entity is updated in the model with the given
 * state. The update is applied as shallow merge, specifically as
 * `Object.assign({}, oldEntity, update)`
 *
 * This is a low level operation that has no semantics and is not aware of any
 * potential implications of the change.
 */
export interface UpdateEntityOperation extends Operation {
  type: typeof UpdateEntityOperationType;

  update: Partial<Entity> & Pick<Entity, "id">;
}

export function createUpdateEntityOperation(update: Partial<Entity> & Pick<Entity, "id">): UpdateEntityOperation {
  if (!(
    typeof update === "object" &&
    update !== null &&
    "id" in update &&
    typeof update.id === "string" &&
    update.id.length > 0 &&
    (
      "type" in update ? (
        Array.isArray(update.type) &&
        update.type.every((t) => typeof t === "string")
      ) : true
    )
  )) {
    throw new Error("Invalid update entity.");
  }

  return {
    id: generateOperationId(),
    type: UpdateEntityOperationType,
    update,
  };
}

export function isUpdateEntityOperation(operation: Operation): operation is UpdateEntityOperation {
  return operation.type === UpdateEntityOperationType;
}
