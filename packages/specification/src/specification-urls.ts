export interface SpecificationUrlOverride {
  baseUrl?: string;
  preferRelativeLinking?: boolean;
}

export interface SpecificationUrlOptions {
  baseUrl?: string | null;
  publicBaseUrl?: string | null;
  documentationUrl?: string | null;
  preferRelativeLinking?: boolean;
}

export interface SpecificationUrls {
  baseUrl: string;
  hasBaseUrlOverride: boolean;
  preferRelativeLinking: boolean;
  artifactUrl(path: string): string;
  documentationUrl(path: string): string;
}

/**
 * Keeps artifact and documentation links consistent across generators and specifications.
 * Uses the override, configured publication base, or `/`, preserving query parameters
 * after each artifact path. Imported documentation URLs apply only without an override.
 * Callers use relative links internally; relative external HTTP(S) links require opt-in.
 */
export function resolveSpecificationUrls(
  options: SpecificationUrlOptions,
): SpecificationUrls {
  const baseUrl = options.baseUrl ?? (options.publicBaseUrl || "/");
  const suffixIndex = baseUrl.search(/[?#]/);
  const pathname = suffixIndex === -1 ? baseUrl : baseUrl.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : baseUrl.slice(suffixIndex);
  const directory = pathname.endsWith("/") ? pathname : pathname + "/";
  const artifactUrl = (path: string) => directory + path.replace(/^\/+/, "") + suffix;
  const hasBaseUrlOverride = options.baseUrl != null;

  return {
    baseUrl: artifactUrl(""),
    hasBaseUrlOverride,
    preferRelativeLinking: options.preferRelativeLinking ?? false,
    artifactUrl,
    documentationUrl: (path: string) => !hasBaseUrlOverride && options.documentationUrl
      ? options.documentationUrl
      : artifactUrl(path),
  };
}
