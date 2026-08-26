export function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : String(caught);
}
