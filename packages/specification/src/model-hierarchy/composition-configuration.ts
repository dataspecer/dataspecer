/**
 * Model composition configuration defines how models are composed together.
 *
 * The simplest form of composition is a string representing the model
 * identifier of the single model. Thus, nothing to be composed.
 *
 * In case of application profile, you specify the profiling model and the model
 * it profiles.
 *
 * If you profile multiple models, you need to merge them first.
 *
 * There is also a cache model for SGOV use.
 *
 * Typical configuration:
 *
 * ```json
 * {
 *   "modelType": "application-profile",
 *   "model": "abcaf2f9-21b5-49a8-9b11-e62b66dfc37e",
 *   "profiles": {
 *     "modelType": "merge"
 *   }
 * }
 * ```
 */
export type ModelCompositionConfiguration =
  | string
  | {
      modelType: "merge" | "application-profile" | "cache";
    };

export type ModelCompositionConfigurationMerge = ModelCompositionConfiguration & {
  modelType: "merge";
  /**
   * If null, it means merge all models that were not merged yet.
   */
  models: {
    model: ModelCompositionConfiguration;
  }[] | null;
};

export type ModelCompositionConfigurationApplicationProfile = ModelCompositionConfiguration & {
  modelType: "application-profile";
  model: ModelCompositionConfiguration;
  profiles: ModelCompositionConfiguration;
  canAddEntities: boolean;
  canModify: boolean;
};

export type ModelCompositionConfigurationCache = ModelCompositionConfiguration & {
  modelType: "cache";
  model: ModelCompositionConfiguration;
  caches: ModelCompositionConfiguration;
};
