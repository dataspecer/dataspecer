import {
  ExternalSemanticModel,
  InMemorySemanticModel,
} from "@/dataspecer/semantic-model";
import { InMemoryEntityModel } from "@dataspecer/core-v2";
import {
  Entity,
  EntityIdentifier,
  ModelIdentifier,
  EntityModel,
  isObservableEntityModelV2,
} from "@dataspecer/entity-model";
import {
  isVisualModel,
  isWritableVisualModel,
  WritableVisualModel,
} from "@dataspecer/visual-model";
import { useEffect, useRef } from "react";

type EntitiesChanges = {
  [model: ModelIdentifier]: {
    created: Entity[],
    updated: Entity[],
    deleted: EntityIdentifier[],
  }
};

export interface ModelObserver {

  onEntitiesDidChange: (event: EntitiesChanges) => void;

}

/**
 * Helper hook to observe changes in given models.
 * When a new model is added a model entity together with all entities
 * are send as created to the observer.
 * When a model is removed all entities and the model entity
 * are send as deleted to the observer.
 *
 * This is a temporary hook it will be removed with new operation interface.
 *
 * @deprecated
 */
export function useModelObserver(
  entityModels: Map<ModelIdentifier, EntityModel>,
  visualModels: Map<ModelIdentifier, WritableVisualModel>,
  observer: ModelObserver,
) {
  const stateRef = useRef<ModelObserverState>({
    entityModels: new Map(),
    visualModels: new Map(),
    observer: null,
  });

  useEffect(() => {
    const state = stateRef.current;
    console.log("use-model-observer.use-effect", { entityModels, visualModels });

    // When component reload in develop mode the observer change.
    // Thus we need to reload all entities, we do this bu updating the state.
    if (state.observer !== observer) {
      state.entityModels.clear();
      state.visualModels.clear();
      state.observer = observer;
      console.log("  observer has changed, running full reload!")
    }

    const [removedEntityModels, newEntityModels] =
      diffArrays([...state.entityModels.keys()], [...entityModels.keys()]);

    const [removedVisualModel, newVisualModels] =
      diffArrays([...state.visualModels.keys()], [...visualModels.keys()]);

    // We store all changes here and invoke the observer only once at the end.
    // We know we are in a single thread so no updates are going interrupt.
    const changes: EntitiesChanges = {};

    // Unsubscribe and remove entities from entity models.
    for (const modelIdentifier of removedEntityModels) {
      const entry = state.entityModels.get(modelIdentifier);
      if (entry === undefined) {
        continue;
      }
      entry.unsubscribe();
      changes[modelIdentifier] = {
        created: [],
        updated: [],
        deleted: [
          ...Object.keys(entry.model.getEntities()),
          createModelMetadataEntityId(entry.model),
        ],
      };
      state.entityModels.delete(modelIdentifier);
    }

    // Unsubscribe and remove entities from visual models.
    for (const modelIdentifier of removedVisualModel) {
      const entry = state.visualModels.get(modelIdentifier);
      if (entry === undefined) {
        continue;
      }
      entry.model.getVisualEntities()
      entry.unsubscribe();
      changes[modelIdentifier] = {
        created: [],
        updated: [],
        deleted: [
          ...entry.model.getVisualEntities().keys(),
          createModelMetadataEntityId(entry.model),
        ],
      };
      state.entityModels.delete(modelIdentifier);
    }

    // Register for new entity models.
    for (const modelIdentifier of newEntityModels) {
      const model = entityModels.get(modelIdentifier)!;
      // We keep list of existing entities to distinguish between
      // created and updates.
      const entities = new Set<string>();
      // Handle subscription.
      const unsubscribe = isObservableEntityModelV2(model)
        ? model.subscribeToChanges((updated, removed) => {
          const created: Entity[] = [];
          const changed: Entity[] = [];
          for (const [entityIdentifier, entity] of Object.entries(updated)) {
            if (entities.has(entityIdentifier)) {
              changed.push(entity);
            } else {
              created.push(entity);
              entities.add(entityIdentifier);
            }
          }
          removed.forEach(item => entities.delete(item));
          //
          observer.onEntitiesDidChange({
            [modelIdentifier]: {
              created,
              updated: changed,
              deleted: removed,
            }
          });
        })
        : () => null;
      // Add all entities.
      changes[modelIdentifier] = {
        created: [
          createModelMetadataEntity(model),
          ...Object.values(model.getEntities()),
        ],
        updated: [],
        deleted: [],
      };
      // Add model.
      state.entityModels.set(modelIdentifier, { model, unsubscribe });
    }

    // Register for new visual models.
    for (const modelIdentifier of newVisualModels) {
      const model = visualModels.get(modelIdentifier)!;
      // Handle subscription.
      const unsubscribe = model.subscribeToChanges({
        modelColorDidChange() { /* No action here. */ },
        visualEntitiesDidChange(entities) {
          const created: Entity[] = [];
          const updated: Entity[] = [];
          const deleted: EntityIdentifier[] = [];
          //
          for (const { previous, next } of entities) {
            if (previous === null) {
              if (next === null) {
                // No action here.
              } else {
                // Compatibility layer for Entity and VisualEntity.
                created.push({ ...next, id: next.identifier });
              }
            } else {
              if (next === null) {
                deleted.push(previous.identifier);
              } else {
                // Compatibility layer for Entity and VisualEntity.
                updated.push({ ...next, id: next.identifier });
              }
            }
          }
          //
          observer.onEntitiesDidChange({
            [modelIdentifier]: { created, updated, deleted }
          });
        },
      });
      // Add all entities.
      changes[modelIdentifier] = {
        created: [
          createModelMetadataEntity(model),
          ...model.getVisualEntities().values()
            .map(item => ({ ...item, id: item.identifier })),
        ],
        updated: [],
        deleted: [],
      };
      // Add model.
      state.visualModels.set(modelIdentifier, { model, unsubscribe });
    }

    // Call the update at the end, thus we batch all the changes together.
    observer.onEntitiesDidChange(changes);

  }, [entityModels, visualModels, observer, stateRef]);

}

interface ModelObserverState {

  entityModels: Map<ModelIdentifier, {

    model: EntityModel;

    unsubscribe: () => void;

  }>;

  visualModels: Map<ModelIdentifier, {

    model: WritableVisualModel;

    unsubscribe: () => void;

  }>;

  observer: ModelObserver | null;

}

function diffArrays<T>(
  previous: T[], next: T[],
): [T[], T[]] {
  const removed: T[] = previous.filter(item => !next.includes(item));
  const added: T[] = next.filter(item => !previous.includes(item));
  return [removed, added];
}

//
// TEMPORARY DEFINITION OF MODEL ENTITIES
//

function createModelMetadataEntity(
  model: { getId(): ModelIdentifier; },
): ModelMetadataEntity {
  let types: string[] = [MAIN_ENTITY_TYPE];
  let label = model.getId();
  let baseIri: string | undefined = undefined;
  if (model instanceof InMemorySemanticModel) {
    types.push(SEMANTIC_MODEL);
    label = model.getAlias() ?? label;
    baseIri = model.getBaseIri();
  }
  if (model instanceof InMemoryEntityModel) { // PimStoreWrapper
    types.push(PIM_STORE_MODEL);
    label = model.getAlias() ?? label;
    baseIri = baseIri ?? "";
  }
  if (model instanceof ExternalSemanticModel) {
    types.push(EXTERNAL_SEMANTIC_MODEL);
    label = model.getAlias() ?? label;
    baseIri = baseIri ?? "";
  }
  if (isVisualModel(model) || isWritableVisualModel(model)) {
    types.push(VISUAL_MODEL);
  }
  return {
    id: createModelMetadataEntityId(model),
    type: types,
    label: { "": label },
    // Model specific properties.
    baseIri,
  } as ModelMetadataEntity;
}

const MAIN_ENTITY_TYPE = "main-entity";

const SEMANTIC_MODEL = "semantic-model";

const EXTERNAL_SEMANTIC_MODEL = "external-semantic-model";

const PIM_STORE_MODEL = "pim-store-model";

const VISUAL_MODEL = "visual-model";

/**
 * This represents a metadata about model.
 * We use this to communicate changes about model.
 * Inspired by {@link https://github.com/dataspecer/dataspecer/pull/1454}.
 */
export interface ModelMetadataEntity extends Entity {

  label: LanguageString;

}

export function isModelMetadataEntity(
  what: Entity,
): what is ModelMetadataEntity {
  return what.type.includes(MAIN_ENTITY_TYPE);
}

export interface SemanticModelMetadataEntity extends ModelMetadataEntity {

  baseIri: string;

}

export function isSemanticModelEntity(
  what: Entity,
): what is SemanticModelMetadataEntity {
  return what.type.includes(SEMANTIC_MODEL);
}

export function isExternalSemanticModelEntity(
  what: Entity,
): what is SemanticModelMetadataEntity {
  return what.type.includes(EXTERNAL_SEMANTIC_MODEL);
}

export function isPimStoreModelEntity(
  what: Entity,
): what is SemanticModelMetadataEntity {
  return what.type.includes(PIM_STORE_MODEL);
}

export function isVisualModelEntity(
  what: Entity,
): what is ModelMetadataEntity {
  return what.type.includes(VISUAL_MODEL);
}

type LanguageString = { [key: string]: string };

function createModelMetadataEntityId(
  model: { getId(): ModelIdentifier; },
): ModelIdentifier {
  return model.getId() + "-main-entity";
}
