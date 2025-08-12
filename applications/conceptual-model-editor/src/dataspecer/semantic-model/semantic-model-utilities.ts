/**
 * The range is the one with the IRI, or just the second one.
 */
export const selectDomainAndRange = <T extends { iri: string | null }>(
  ends: T[],
): T[] => {
  const [first, second] = ends;
  if (isDefined(first?.iri)) {
    return [second, first];
  } else if (isDefined(second?.iri)) {
    return [first, second];
  } else {
    return [first, second];
  }
};

const isDefined = <T>(value: T | null | undefined) => {
  return value !== undefined && value !== null;
};
