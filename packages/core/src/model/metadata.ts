import type { LanguageString } from "../core/core-resource.ts";

/**
 * Cached summary of a model for places that need basic information without
 * loading its entities, such as the project model and model lists. For models
 * with a main entity, its label and description are projections of that entity.
 */
export interface ModelMetadata {
  label: LanguageString;
  description: LanguageString;
}
