/** Joins one segment onto a dotted field path. */
export function joinFieldPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}
