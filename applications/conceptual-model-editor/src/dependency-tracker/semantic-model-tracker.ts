import { Entity, ModelIdentifier } from "@dataspecer/entity-model";

import { Tracker } from "./dependency-tracker";
import {
  isExternalSemanticModelEntity,
  isPimStoreModelEntity,
  isSemanticModelEntity,
} from "./model-observer";

export function createSemanticModelTracker(
  models: Map<ModelIdentifier, SemanticModelEntry>,
): Tracker {
  return new SemanticModelTracker(models);
}

/**
 * Track information about semantic models.
 */
class SemanticModelTracker implements Tracker {

  readonly models: Map<ModelIdentifier, SemanticModelEntry>;

  constructor(models: Map<ModelIdentifier, SemanticModelEntry>) {
    this.models = models;
  }

  onEntityDidCreate(model: ModelIdentifier, next: Entity) {
    if (isSemanticModelEntity(next)) {
      this.models.set(model, {
        metadataEntity: next.id,
        model: model,
        label: next.label,
        baseIri: next.baseIri,
        isExternal: false,
        isReadOnly: false,
      });
    } else if (isExternalSemanticModelEntity(next)) {
      this.models.set(model, {
        metadataEntity: next.id,
        model: model,
        label: next.label,
        baseIri: next.baseIri,
        isExternal: true,
        isReadOnly: true,
      });
    } else if (isPimStoreModelEntity(next)) {
      this.models.set(model, {
        metadataEntity: next.id,
        model: model,
        label: next.label,
        baseIri: next.baseIri,
        isExternal: false,
        isReadOnly: true,
      });
    }
  }

  onEntityDidChange(model: ModelIdentifier, _previous: Entity, next: Entity) {
    if (isSemanticModelEntity(next)
      || isExternalSemanticModelEntity(next)
      || isPimStoreModelEntity(next)) {
      const entity = this.models.get(model);
      if (entity === undefined) {
        return;
      }
      entity.label = next.label;
      entity.baseIri = next.baseIri;
    }
  }

  onEntityDidRemove(model: ModelIdentifier, previous: Entity) {
    if (isSemanticModelEntity(previous)) {
      this.models.delete(model);
    } else if (isExternalSemanticModelEntity(previous)) {
      this.models.delete(model);
    } else if (isPimStoreModelEntity(previous)) {
      this.models.delete(model);
    }
  }

}

export interface SemanticModelEntry {

  /**
   * Model is represented by this entity.
   */
  metadataEntity: ModelIdentifier;

  model: ModelIdentifier;

  label: LanguageString;

  baseIri: string;

  isReadOnly: boolean;

  isExternal: boolean;

}

type LanguageString = { [key: string]: string };
