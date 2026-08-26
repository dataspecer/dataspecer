const editorUrl = import.meta.env.VITE_DATA_SPECIFICATION_EDITOR as string | undefined;

/** Link to the specification overview, or null when the editor URL is not configured. */
export function specificationLink(dataSpecificationIri: string): string | null {
  if (!editorUrl) {
    return null;
  }
  return `${editorUrl}/specification?dataSpecificationIri=${encodeURIComponent(dataSpecificationIri)}`;
}

/**
 * Link to the structure an aggregate comes from. The aggregate IRI is the data-psm schema IRI,
 * which is what the specification editor opens.
 */
export function aggregateLink(dataSpecificationIri: string, aggregateIri: string): string | null {
  if (!editorUrl || !aggregateIri) {
    return null;
  }
  return (
    `${editorUrl}/editor?data-specification=${encodeURIComponent(dataSpecificationIri)}` +
    `&data-psm-schema=${encodeURIComponent(aggregateIri)}`
  );
}
