
/**
 * @returns A function that resolves given IRI with respect to the {@link base}.
 */
export function createNullAwareIriResolver(
  base: string | null,
): (iri: string | null) => string | null {
  if (base === null) {
    return iri => iri;
  } else {
    const resolver = createIriResolver(base);
    return iri => iri === null ? null : resolver(iri);
  }
}

/**
 * This function does not support working with nulls.
 *
 * @returns A function that resolves given IRI with respect to the {@link base}.
 */
export function createIriResolver(base: string): (iri: string) => string {
  return (iri: string) => {
    return isAbsoluteIri(iri) ? iri : base + iri;
  };
}

/**
 * @returns True when given {@link iri} is absolute.
 */
export function isAbsoluteIri(iri: string): boolean {
  const schema = getSchema(iri);
  return schema !== null;
}

const SCHEMA = new RegExp("^[a-z0-9-.+]+:", "i");

function getSchema(iri: string): string | null {
  var scheme = iri.match(SCHEMA);
  return scheme === null ? null : scheme[0].slice(0, -1);
}
