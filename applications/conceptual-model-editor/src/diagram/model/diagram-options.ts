export type DiagramOptions = {

  labelVisual: LabelVisual;

  entityMainColor: EntityColor;

  profileOfVisual: ProfileOfVisual;

  /**
   * Show range label using {@link labelVisual} and cardinality.
   */
  displayRangeDetail: boolean;

  /**
   * When true <<profile>> is shown for relationship profiles.
   */
  displayRelationshipProfileArchetype: boolean;

  /**
   * Label used for "profile of" entity list rendering.
   */
  profileOfLabel: string;

}

export function defaultDiagramOptions(profileOfLabel: string): DiagramOptions {
  return {
    labelVisual: LabelVisual.Entity,
    entityMainColor: EntityColor.Entity,
    profileOfVisual: ProfileOfVisual.Entity,
    displayRangeDetail: true,
    displayRelationshipProfileArchetype: true,
    profileOfLabel,
  };
}

export enum LabelVisual {
  /**
   * Use entity's IRI.
   */
  Iri,
  /**
   * Use entity label.
   */
  Entity,
  /**
   * Use labels from profiled vocabularies or entity.
   */
  VocabularyOrEntity,
}

export enum EntityColor {
  /**
   * Use entity model color.
   */
  Entity,
  /**
   * Use majority of vocabularies model color, or entity's model color.
   */
  VocabularyOrEntity,
}

export enum ProfileOfVisual {
  /**
   * Do not display profile of information.
   */
  None,
  /**
   * Use profile label.
   */
  Entity,
  /**
   * Use profile IRI.
   */
  Iri,
}
