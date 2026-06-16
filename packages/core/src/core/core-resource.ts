import type { Entity } from "../entity-model/index.ts";

/**
 * Allow for single value in each language. It is not possible to have
 * multiple values for a single language.
 */
export type LanguageString = Record<string, string>;

/**
 * Core object that support type control.
 */
export class CoreTyped {
  /**
   * Types used by core model. Single resource can be of multiple
   * application types like PimClass, PimAttribute, etc..
   */
  types: string[] = [];

  protected constructor() {}
}

/**
 * Define the a core resource for the model, this interface shall be
 * used as a base class for every other core entity/object.
 *
 * @deprecated This interface is deprecated and all models should be refactored
 * to use {@link Entity} instead.
 */
export class CoreResource extends CoreTyped {
  /**
   * In order to allow identification of all resources they must all use
   * named nodes. Blank nodes are not allowed. This property can
   * be set to null for new objects.
   */
  iri: string | null;

  protected constructor(iri: string | null) {
    super();
    this.iri = iri;
  }
}

export type CoreResourceAndEntity = Entity & CoreResource;

export function coreResourceToEntity(resource: CoreResource): CoreResourceAndEntity {
  return {
    ...resource,
    id: resource.iri!,
    type: resource.types!,
  };
}
