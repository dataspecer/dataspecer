/**
 * Aggregated class profiles carry identifiers of all controlled vocabulary
 * assignments that apply to them, both their own and the inherited ones.
 */
interface WithControlledVocabularies {
  controlledVocabularies?: string[];
}

/**
 * Returns true if the given semantic model entity has at least one controlled vocabulary assigned,
 * regardless of the assignment qualifier.
 */
export function hasControlledVocabulary(entity: object | null | undefined): boolean {
  return ((entity as WithControlledVocabularies)?.controlledVocabularies?.length ?? 0) > 0;
}
