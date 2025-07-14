import { IRI } from "iri";

/**
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
  return (new IRI(iri).scheme()?.length ?? 0) > 0;
}

