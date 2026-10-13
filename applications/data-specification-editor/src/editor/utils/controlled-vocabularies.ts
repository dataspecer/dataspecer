/**
 * Aggregated class profiles carry identifiers of all controlled vocabulary
 * assignments that apply to them, both their own and the ones assigned from
 * the profiled entities.
 */
interface WithControlledVocabularies {
  controlledVocabularies?: string[];
}

/**
 * Returns true if the given semantic model entity has at least one controlled vocabulary assigned,
 * regardless of the assignment qualifier.
 */
export function hasControlledVocabulary(entity: object | null | undefined): boolean {
  return getControlledVocabularyAssignmentIds(entity).length > 0;
}

/**
 * Returns identifiers of all controlled vocabulary assignments that apply to
 * the given semantic model entity, both its own and the ones assigned from the profiled entities.
 */
export function getControlledVocabularyAssignmentIds(entity: object | null | undefined): string[] {
  return (entity as WithControlledVocabularies)?.controlledVocabularies ?? [];
}
