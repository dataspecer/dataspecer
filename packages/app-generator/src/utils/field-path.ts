/** Joins one segment onto a dotted field path. */
export function joinFieldPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}

/** Splits a dotted field path and removes empty segments. */
export function splitFieldPath(path: string): string[] {
  return path.split('.').filter((segment) => segment.length > 0);
}
