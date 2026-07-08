/**
 * Splits a dotted field config path into its segments, dropping empty segments so paths like
 * "a..b" normalize to the same segments as "a.b".
 */
export function splitFieldPath(path: string): string[] {
  return path.split('.').filter((segment) => segment.length > 0);
}
