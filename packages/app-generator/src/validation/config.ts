export function getObjectConfig(
  config: Record<string, unknown> | undefined,
  key: string
): Record<string, unknown> | undefined {
  const value = config?.[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}
