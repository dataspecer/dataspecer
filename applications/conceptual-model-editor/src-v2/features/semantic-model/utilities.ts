/**
 * Relationship ends are stored in an arbitrary order.
 * The end carrying an IRI is conventionally the range.
 * The other end is the domain.
 * @returns Tuple [domain, range].
 */
export function selectDomainAndRange<T extends { iri: string | null }>(
  ends: T[],
): [T, T] {
  const [first, second] = ends;
  if (isDefined(first?.iri)) {
    return [second, first];
  } else if (isDefined(second?.iri)) {
    return [first, second];
  } else {
    return [first, second];
  }
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}
