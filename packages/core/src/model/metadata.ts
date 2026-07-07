import type { LanguageString } from "../core/core-resource.ts";

/**
 * Basic metadata describing a model. The idea is that this is a summary of the
 * model that can be obtained by reading the model and used in places where only
 * a summary is needed (e.g. in the model list).
 *
 * @todo split to two interfaces, one for the main entity, one for computed
 *  metadata (e.g. number of entities)
 */
export interface ModelMetadata {
  label: LanguageString;
  description: LanguageString;
}
