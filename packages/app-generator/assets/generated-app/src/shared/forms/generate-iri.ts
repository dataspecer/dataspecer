// Generates an IRI for a new entity. With a configured base it appends a random UUID, otherwise
// it produces a urn:uuid IRI that is always valid. The result is a prefill the user can override.
export function generateIri(base: string): string {
  const uuid = crypto.randomUUID();
  return base ? `${base}/${uuid}` : `urn:uuid:${uuid}`;
}
