import {
  Entity, EntityIdentifier, ModelIdentifier,
} from "@dataspecer/entity-model";
import {
  isModelVisualInformation,
  VISUAL_MODEL_ENTITY_TYPE,
  VisualModelData,
} from "@dataspecer/visual-model";

import { Tracker } from "./dependency-tracker";
import {
  isExternalSemanticModelEntity,
  isPimStoreModelEntity,
  isSemanticModelEntity,
  isVisualModelEntity,
} from "./model-observer";

export function createVisualModelTracker(
  models: Map<ModelIdentifier, VisualModelEntry>,
): Tracker {
  return new VisualModelTracker(models);
}

/**
 * Track information about visual models.
 * For each model track label and coloring of semantic models.
 */
class VisualModelTracker implements Tracker {

  readonly models: Map<ModelIdentifier, VisualModelEntry>;

  constructor(models: Map<ModelIdentifier, VisualModelEntry>) {
    this.models = models;
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity) {
    if (isVisualModelEntity(next)) {
      this.models.set(model, {
        metadataEntity: next.id,
        model: model,
        colors: {},
        label: {},
      });
    }
    if (next.type.includes(VISUAL_MODEL_ENTITY_TYPE)) {
      // Contains information about the visual model see ModelEntity.
      const visualData = this.getOrCreateModel(model);
      visualData.metadataEntity = next.id;
      visualData.label = (next as any).label ?? {};
    }
    if (isModelVisualInformation(next)) {
      const visualModel = this.getOrCreateModel(model);
      if (next.representedModel !== null && next.color !== null) {
        visualModel.colors[next.representedModel] = next.color;
      }
    }
  }

  private getOrCreateModel(model: ModelIdentifier): VisualModelEntry {
    let result = this.models.get(model);
    if (result === undefined) {
      result = {
        metadataEntity: null,
        model: model,
        label: {},
        colors: {},
      }
    };
    this.models.set(model, result);
    return result;
  }

  onEntityDidChange(model: ModelIdentifier, _: Entity, next: Entity): void {
    if (next.type.includes("entity-model-type")) {
      // Contains information about the visual model see ModelEntity.
      const visualData = this.getOrCreateModel(model);
      visualData.label = (next as any).label ?? {};
    }
    if (isModelVisualInformation(next as any)) {
      const visual = next as unknown as VisualModelData;
      const visualModel = this.getOrCreateModel(model);
      if (visual.representedModel !== null && visual.color !== null) {
        visualModel.colors[visual.representedModel] = visual.color;
      }
    }
  }

  onEntityDidRemove(model: ModelIdentifier, previous: Entity): void {
    if (isSemanticModelEntity(previous)
      || isExternalSemanticModelEntity(previous)
      || isPimStoreModelEntity(previous)) {
      // Remove visual information about the model.
      // TODO Remove this once we properly delete all model entities.
      this.models.values().forEach(visualModel => {
        delete visualModel.colors[model];
      });
    }
    if (isVisualModelEntity(previous)) {
      this.models.delete(model);
    }
    if (isModelVisualInformation(previous as any)) {
      const typed = previous as unknown as VisualModelData;
      const visualModel = this.models.get(typed.representedModel);
      if (visualModel !== undefined) {
        delete visualModel.colors[typed.representedModel];
      }
    }
  }

}

export interface VisualModelEntry {

  metadataEntity: EntityIdentifier | null;

  model: ModelIdentifier;

  label: LanguageString;

  colors: { [identifier: ModelIdentifier]: string };

}

type LanguageString = { [key: string]: string };
