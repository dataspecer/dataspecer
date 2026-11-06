import type { LanguageString } from "../core/core-resource.ts";

/**
 * Model metadata is a cached summary of a model computed only from the model
 * itself (possibly with its own history). It is used in places that need basic
 * information about a model without loading its entities.
 *
 * Model metadata are then provided in project model and should be automatically
 * updated by model providers.
 *
 * @todo Currently this information is stored as "user metadata" and for project
 *  it also contains tags which are not stored anywhere else. This needs to be
 *  refactored to fit the definition above.
 */
export interface ModelMetadata {
  label: LanguageString;
  description: LanguageString;
}
