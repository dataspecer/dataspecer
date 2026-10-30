import type { SemanticModelClass, SemanticModelEntity } from "../concepts/concepts.ts";

/**
 * Reads semantic entities from an external conceptual vocabulary that is
 * possibly too large to load entirely.
 *
 * For historical reasons the name is "CIM" (Computational Independent Model).
 */
export interface CimAdapter {
  /**
   * Returns matching classes in search order.
   */
  search(searchQuery: string): Promise<SemanticModelClass[]>;

  /**
   * Returns the class and its direct generalizations, or an empty array.
   */
  getClass(iri: string): Promise<SemanticModelEntity[]>;

  /**
   * Returns the class, its relationships, linked classes and generalizations.
   */
  getSurroundings(iri: string): Promise<SemanticModelEntity[]>;

  /**
   * Returns the known ancestors and descendants, including generalizations.
   */
  getFullHierarchy(iri: string): Promise<SemanticModelEntity[]>;

  /**
   * @todo This was originally used to obtain additional information about
   *  concepts (more specifically skos:inScheme) which was used in UI for
   *  grouping. In the future, we should consider storing this information
   *  directly in the entity so this side loading would not be necessary.
   */
  getResourceGroup(iri: string): Promise<string[]>;
}
