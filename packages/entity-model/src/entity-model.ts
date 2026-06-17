/**
 * @deprecated The `packages/entity-model` sources are deprecated.
 * Use the entity model implementation in `packages/core/src/entity-model` instead.
 * See: ../../core/src/entity-model/index.ts
 */
import { Entity, EntityRecord } from "./model/entity.ts";

/**
 * @deprecated Use `ModelIdentifier` from `packages/core/src/model/model.ts`.
 * See: ../../core/src/model/model.ts
 */
export type ModelIdentifier = string;

/**
 * @deprecated Use `EntityModel` from `packages/core/src/entity-model/entity-model.ts`.
 * See: ../../core/src/entity-model/entity-model.ts
 */
export interface EntityModel {

  getId(): ModelIdentifier;

  getEntities(): EntityRecord;

}

type Observer = (updated: Record<string, Entity>, removed: string[]) => void;

/**
 * @deprecated Use `ObservableEntityModel` from `packages/core/src/entity-model/observable.ts`.
 * See: ../../core/src/entity-model/observable.ts
 */
export interface ObservableEntityModelV2 extends EntityModel {

  subscribeToChanges(callback: Observer): () => void;

}

/**
 * @deprecated Prefer `ObservableEntityModel` from `packages/core/src/entity-model/observable.ts`.
 * Use `isEntityModel`/type checks from the core package where appropriate.
 * See: ../../core/src/entity-model/observable.ts
 */
export function isObservableEntityModelV2(
  model: EntityModel,
): model is ObservableEntityModelV2 {
  return (model as any).subscribeToChanges !== undefined;
}
