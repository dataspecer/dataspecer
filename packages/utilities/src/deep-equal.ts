/**
 * Compares two objects and returns if they are deeply equal.
 * @todo Make it more robust by handling edge cases like circular references,
 * functions, etc.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }
  const keysA = new Set(Object.keys(a));
  const keysB = new Set(Object.keys(b));
  if (keysA.symmetricDifference(keysB).size > 0) {
    return false;
  }
  for (const key of keysA) {
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}
