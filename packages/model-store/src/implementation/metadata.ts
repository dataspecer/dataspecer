import { LOCAL_SEMANTIC_MODEL, RDFS_MODEL, V1, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { getSemanticModelMetadata } from "@dataspecer/core-v2/semantic-model";
import { getStructureModelMetadata } from "@dataspecer/core/data-psm";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { ModelIdentifier, ModelMetadata } from "@dataspecer/core/model";
import { getVisualModelMetadata } from "@dataspecer/visual-model";
import { getPimModelMetadata } from "./pim-model.ts";

/**
 * Extracts metadata (label, description) from a given model. Metadata is an
 * information about the model computed from the model content. It is used to
 * display basic information about the model in the user interface.
 *
 * @see {@link ModelMetadata} for more information.
 * @todo move to more core package
 * @todo create setModelMetadata function that produces operations on the target
 *  model
 */
export function getModelMetadata(modelType: string, entities: EntityRecord, modelId: ModelIdentifier): ModelMetadata | null {
  switch (modelType) {
    case LOCAL_SEMANTIC_MODEL:
      return getSemanticModelMetadata(entities, modelId);
    case VISUAL_MODEL:
      return getVisualModelMetadata(entities, modelId);
    case V1.PSM:
      return getStructureModelMetadata(entities, modelId);
    case RDFS_MODEL:
      return getPimModelMetadata(entities, modelId);
    default:
      return null;
  }
}
