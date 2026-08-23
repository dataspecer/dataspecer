/**
 * Encodes string parts as one collision-safe map or set key.
 */
export function compositeKey(...parts: string[]): string {
  return JSON.stringify(parts);
}
