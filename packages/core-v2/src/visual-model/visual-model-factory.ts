import { wrapWithColorGenerator } from "./color-generator-wrap.ts";
import { VISUAL_MODEL_DATA_TYPE } from "./concepts/index.ts";
import { DefaultVisualModel } from "./default-visual-model.ts";
import { createDefaultEntityModel } from "./entity-model/default-entity-model.ts";
import { EntityModel } from "./entity-model/entity-model.ts";
import { LabeledModel } from "./entity-model/labeled-model.ts";
import { LegacyModel } from "./entity-model/legacy-model.ts";
import { ObservableEntityModel } from "./entity-model/observable-entity-model.ts";
import { SynchronousWritableEntityModel } from "./entity-model/on-premise-writable-entity-model.ts";
import { SerializableModel } from "./entity-model/serializable-model.ts";
import { SynchronousEntityModel } from "./entity-model/synchronous-entity-model.ts";
import { WritableVisualModel } from "./writable-visual-model.ts";

/**
 * Definition of a model we can use as internal model for the visual model.
 */
export interface SynchronousUnderlyingVisualModel extends
  EntityModel,
  SynchronousEntityModel,
  SynchronousWritableEntityModel,
  ObservableEntityModel,
  SerializableModel,
  LabeledModel,
  LegacyModel { }


export interface VisualModelFactory {

  /**
   * Temporary method till the internal entity model is aligned with
   * the external one.
   *
   * @deprecated Use other method instead.
   */
  createNewWritableVisualModelSync(): WritableVisualModel;

  /**
   * Create default visual model by wrapping other model.
   */
  createWritableVisualModelSync(
    model: SynchronousUnderlyingVisualModel,
  ): WritableVisualModel;

  /**
   * Create default visual model with no wraps.
   * Do not use this method unless you have a good reason,
   * use {@link createWritableVisualModelSync} instead.
   */
  createWritableVisualModelSyncNoWrap(
    model: SynchronousUnderlyingVisualModel,
  ): WritableVisualModel;

}

class DefaultVisualModelFactory implements VisualModelFactory {

  createNewWritableVisualModelSync() {
    const identifier = createIdentifier();
    const internal = createDefaultEntityModel(
      VISUAL_MODEL_DATA_TYPE, identifier);
    return this.createWritableVisualModelSync(internal);
  }

  createWritableVisualModelSync(
    model: SynchronousUnderlyingVisualModel,
  ): WritableVisualModel {
    return wrapWithColorGenerator(new DefaultVisualModel(model));
  }

  createWritableVisualModelSyncNoWrap(
    model: SynchronousUnderlyingVisualModel,
  ): WritableVisualModel {
    return new DefaultVisualModel(model);
  }

}

const createIdentifier = () => (Math.random() + 1).toString(36).substring(7);

const factory = new DefaultVisualModelFactory();

export function createDefaultVisualModelFactory() {
  return factory;
}
