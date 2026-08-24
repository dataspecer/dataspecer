/** Joins one segment onto a dotted validation path. */
export function joinValidationPath(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}
