export interface SpecificationUrlOptions {
  mode: "preview" | "release" | "archive";
  publicBaseUrl?: string | null;
  documentationUrl?: string | null;
  previewBaseUrl?: string;
  outputDirectory?: string;
  queryParams?: string;
}

export interface SpecificationUrls {
  baseUrl: string;
  queryParams: string;
  isGeneratedDocumentation: boolean;
  artifactUrl(path: string): string;
  documentationUrl(path: string): string;
}

/**
 * Keeps artifact and documentation links consistent across generators and specifications.
 * Resolves target URLs using the backend route and target IRI in preview, publication
 * URLs (or `/`) in release, and output directories in archives. Callers make these
 * URLs relative to the referring file; explicit release documentation URLs stay intact.
 */
export function resolveSpecificationUrls(
  specificationId: string,
  options: SpecificationUrlOptions,
): SpecificationUrls {
  let baseUrl = options.mode === "preview" ? options.previewBaseUrl || "/"
    : options.mode === "archive" ? `/${options.outputDirectory ?? ""}`
    : options.publicBaseUrl || "/";
  if (!baseUrl.endsWith("/")) {
    baseUrl += "/";
  }

  let queryParams = "";
  if (options.mode === "preview") {
    const params = new URLSearchParams(options.queryParams);
    params.set("iri", specificationId);
    queryParams = "?" + params.toString();
  }

  const artifactUrl = (path: string) => baseUrl + path.replace(/^\/+/, "") + queryParams;

  return {
    baseUrl,
    queryParams,
    isGeneratedDocumentation: options.mode !== "release",
    artifactUrl,
    documentationUrl: (path: string) => options.mode === "release" && options.documentationUrl
      ? options.documentationUrl
      : artifactUrl(path),
  };
}
