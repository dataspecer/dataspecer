
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

}
