const absoluteIri = /^[a-z][a-z0-9+.-]*:/i;
// These characters cannot appear unescaped in a SPARQL IRIREF, control characters included.
// eslint-disable-next-line no-control-regex
const forbiddenIriCharacters = /[\u0000-\u0020<>"{}|^`\\]/u;

export function isSafeAbsoluteIri(value: string): boolean {
  return absoluteIri.test(value) && !forbiddenIriCharacters.test(value);
}

export function isSafeHttpIri(value: string): boolean {
  if (!isSafeAbsoluteIri(value)) {
    return false;
  }
  try {
    const protocol = new URL(value).protocol.toLowerCase();
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function requireSafeAbsoluteIri(value: unknown, label: string): string {
  if (typeof value !== 'string' || !isSafeAbsoluteIri(value)) {
    throw new Error(`${label} must be a safe absolute IRI.`);
  }
  return value;
}

/** Returns a compact local name when an IRI has a fragment or path segment. */
export function iriLocalName(iri: string): string {
  const separator = Math.max(iri.lastIndexOf('#'), iri.lastIndexOf('/'));
  return separator >= 0 && separator < iri.length - 1 ? iri.slice(separator + 1) : iri;
}

function normalizedReferenceLabel(value: string): string {
  return value.trim().replace(/\s+/gu, ' ').toLowerCase();
}

/** Resolves a normalized, unique option label while preserving manually entered absolute IRIs. */
export function resolveReferenceInput(
  value: string,
  optionIds: readonly string[],
  labelOf: (id: string) => string,
): string {
  const candidate = value.trim();
  if (isSafeAbsoluteIri(candidate)) {
    return candidate;
  }

  const normalizedCandidate = normalizedReferenceLabel(candidate);
  const matches = optionIds.filter(
    (id) => normalizedReferenceLabel(labelOf(id)) === normalizedCandidate,
  );
  return matches.length === 1 ? matches[0] : candidate;
}
