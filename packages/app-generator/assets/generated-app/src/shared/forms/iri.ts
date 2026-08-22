const absoluteIri = /^[a-z][a-z0-9+.-]*:/i;
// These characters cannot appear unescaped in a SPARQL IRIREF, control characters included.
// eslint-disable-next-line no-control-regex
const forbiddenIriCharacters = /[\u0000-\u0020<>"{}|^`\\]/u;

export function isSafeAbsoluteIri(value: string): boolean {
  return absoluteIri.test(value) && !forbiddenIriCharacters.test(value);
}

export function requireSafeAbsoluteIri(value: unknown, label: string): string {
  if (typeof value !== 'string' || !isSafeAbsoluteIri(value)) {
    throw new Error(`${label} must be a safe absolute IRI.`);
  }
  return value;
}
