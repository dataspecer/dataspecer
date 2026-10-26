
/**
 * You can use this configuration object to store all configuration required.
 */
export interface SemanticModelsToShaclConfiguration {

  /**
   * Name of a policy to use.
   */
  policy: "semic-v1";

  /**
   * List of languages to use for sh:name and sh:description.
   */
  languages: string[];

  /**
   * When true no class constraints are produced.
   */
  noClassConstraints: boolean;

  /**
   * When true each property shapes asserts only a single constraint.
   */
  splitPropertyShapesByConstraints: boolean;

  /**
   * When true the IRI of a value of a controlled vocabulary has to match
   * the pattern of the vocabulary (sh:pattern).
   */
  controlledVocabularyPattern: boolean;

  /**
   * When true a value of a SKOS-based controlled vocabulary has to state
   * the concept scheme of the vocabulary using skos:inScheme.
   */
  controlledVocabularyScheme: boolean;

}
