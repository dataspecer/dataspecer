import { ModelIdentifier } from "@dataspecer/core/model";
import { Entity } from "@dataspecer/core/entity-model";
import {
  LOCAL_SEMANTIC_MODEL, QUERYABLE_MODEL, RDFS_MODEL, VISUAL_MODEL,
} from "@dataspecer/core-v2/model/known-models";

import { Logger } from "../../infrastructure/logger";
import { SubscriptionManager } from "../../shared/subscription-manager";
import {
  EventToStateUpdate, CmeProvider, selectStable, StateUpdate, UpdateArray,
} from "../../core/cme-provider";
import { EntitiesChangeEvent } from "../../infrastructure/dataspecer";
import { LanguageString } from "../../shared/types";
import {
  isPackageEntity, isProjectModelEntity, ProjectModelEntity,
} from "@dataspecer/core/project-model";

export function createCmePackageProvider(
  { logger }: { logger: Logger },
): CmePackageProvider {
  return new DefaultCmePackageProvider(logger);
}

export interface CmePackageProvider extends CmeProvider {

  onEntitiesDidChange(event: EntitiesChangeEvent): void;

  subscribe(subscriber: (value: CmePackageEvent) => void): () => void;

}

const CME_PACKAGE_STATE_TYPE = "cme-package-provider-state";

export interface CmePackageEvent {

  type: typeof CME_PACKAGE_STATE_TYPE;

  package: CmeModelMetadata;

  semanticModels: CmeModelMetadata[];

  visualModels: CmeModelMetadata[];

}

export interface CmeModelMetadata {

  id: ModelIdentifier;

  label: LanguageString;

  description: LanguageString;

  /**
   * True for models backed by an external source (e.g. SGOV) rather than
   * entities stored locally in the project.
   */
  isExternal: boolean;

  /**
   * True when entities of this model can not be modified by the user.
   * External models and PIM-store-backed models are read-only.
   */
  isReadOnly: boolean;

}

export function isCmePackageEvent(
  value: { type: string },
): value is CmePackageEvent {
  return value.type === CME_PACKAGE_STATE_TYPE;
}

function isExternalModelType(modelType: string): boolean {
  return modelType === QUERYABLE_MODEL;
}

function isReadOnlyModelType(modelType: string): boolean {
  return modelType !== LOCAL_SEMANTIC_MODEL;
}

const PROJECT_MODEL_IDENTIFIER = "_project_model";

class DefaultCmePackageProvider implements CmePackageProvider {

  private state: CmePackageEvent = {
    type: CME_PACKAGE_STATE_TYPE,
    package: {
      id: "",
      label: {},
      description: {},
      isExternal: false,
      isReadOnly: false,
    },
    semanticModels: [],
    visualModels: [],
  };

  private readonly logger: Logger;

  private readonly subscribers = new SubscriptionManager<CmePackageEvent>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  onEntitiesDidChange(event: EntitiesChangeEvent): void {
    // We just need entities from a single model.
    const model = PROJECT_MODEL_IDENTIFIER;
    const changes = event.entityChanges[model] ?? {};
    const update = new CmePackageUpdate(this.state);
    (new EventToStateUpdate(update)).onEntitiesDidChange(
      { entityChanges: { [model]: changes } });
    // Notify listeners about a new state.
    this.state = update.state();
    this.state = this.updateLabelsFromVisualModel_WORKAROUND_(event);
    this.subscribers.notifyAll(this.state);
  }

  /**
   * Temporary workaround for visual models:
   * For visual models the labe lis not part of the "project-model-entity".
   * We thus need to read the information from the models themselves.
   */
  private updateLabelsFromVisualModel_WORKAROUND_(event: EntitiesChangeEvent) {
    let hasChanged = false;
    let visualModels = [...this.state.visualModels];
    for (const [model, changes] of Object.entries(event.entityChanges)) {
      for (const { next } of Object.values(changes)) {
        // We are interested only in new and changed.
        if (next === null) {
          continue;
        }
        // We search for model entity.
        if (!next.type.includes("entity-model-type")) {
          continue;
        }
        const label: LanguageString = (next as any)["label"] ?? {};
        const index = visualModels.findIndex(item => item.id === model);
        if (index === -1) {
          // This should not happen as we should have the information
          // about the model before this entity.
          this.logger.error("Information about a visual model is ignored.");
          continue;
        }
        // Update label.
        hasChanged = true;
        visualModels[index] = {
          ...visualModels[index],
          label,
        };
      }
    }
    // If there was a change we update the state.
    return hasChanged ? { ...this.state, visualModels } : this.state;
  }

  subscribe(subscriber: (value: CmePackageEvent) => void): () => void {
    return this.subscribers.subscribe(subscriber);
  }

}

class CmePackageUpdate implements StateUpdate<CmePackageEvent> {

  readonly previous: CmePackageEvent;

  package: CmeModelMetadata;

  readonly semantic: UpdateArray<CmeModelMetadata>;

  readonly visual: UpdateArray<CmeModelMetadata>;

  constructor(state: CmePackageEvent) {
    this.previous = state;
    this.package = state.package;
    this.semantic = new UpdateArray(state.semanticModels);
    this.visual = new UpdateArray(state.visualModels);
  }

  private asCmeModelReference(entity: ProjectModelEntity): CmeModelMetadata {
    return {
      id: entity.id,
      label: entity.label,
      description: entity.description,
      isExternal: isExternalModelType(entity.modelType),
      isReadOnly: isReadOnlyModelType(entity.modelType),
    };
  }

  /**
   * A model is a semantic model if it can contain classes/relationships,
   * i.e. anything but the local writable semantic model, the visual model,
   * or another package/model-descriptor entity.
   */
  private isSemanticModelType(modelType: string): boolean {
    return modelType === LOCAL_SEMANTIC_MODEL
      || modelType === QUERYABLE_MODEL
      || modelType === RDFS_MODEL;
  }

  onCreateEntity(_: ModelIdentifier, next: Entity): void {
    if (isPackageEntity(next)) {
      this.package = this.asCmeModelReference(next);
    } else if (isProjectModelEntity(next)) {
      if (this.isSemanticModelType(next.modelType)) {
        this.semantic.onCreateEntity(this.asCmeModelReference(next));
      } else if (next.modelType === VISUAL_MODEL) {
        this.visual.onCreateEntity(this.asCmeModelReference(next));
      }
    }
  }

  onUpdateEntity(_: ModelIdentifier, _previous: Entity, next: Entity): void {
    if (isPackageEntity(next)) {
      this.package = this.asCmeModelReference(next);
    } else if (isProjectModelEntity(next)) {
      if (this.isSemanticModelType(next.modelType)) {
        this.semantic.onUpdateEntity(this.asCmeModelReference(next));
      } else if (next.modelType === VISUAL_MODEL) {
        this.visual.onUpdateEntity(this.asCmeModelReference(next));
      }
    }
  }

  onRemoveEntity(_: ModelIdentifier, previous: Entity): void {
    if (isPackageEntity(previous)) {
      this.package = {
        id: "",
        label: {},
        description: {},
        isExternal: false,
        isReadOnly: false,
      };
    } else if (isProjectModelEntity(previous)) {
      if (this.isSemanticModelType(previous.modelType)) {
        this.semantic.onRemoveEntityById(previous.id);
      } else if (previous.modelType === VISUAL_MODEL) {
        this.visual.onRemoveEntityById(previous.id);
      }
    }
  }

  state(): CmePackageEvent {
    const next: CmePackageEvent = {
      ...this.previous,
      package: this.package,
      semanticModels: this.semantic.state(),
      visualModels: this.visual.state(),
    };
    return selectStable(this.previous, next);
  }

}
