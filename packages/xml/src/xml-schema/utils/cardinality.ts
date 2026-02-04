
export function multiplyMinCardinality(a: number, b: number): number {
  return a * b;
}export function multiplyMaxCardinality(a: number | null, b: number | null): number | null {
  if (a === null || b === null) {
    return null;
  }
  return a * b;
}

