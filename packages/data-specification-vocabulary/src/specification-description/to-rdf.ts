import { pathRelative } from "@dataspecer/core/core/utilities/path-relative";
import context from "./dsv-context.json" with { type: "json" };
import { isApplicationProfile, isVocabularySpecificationDocument, type ExternalSpecification, type ResourceDescriptor, type Specification } from "./model.ts";
import { DSV_METADATA_SCHEMA_ID, DSV_METADATA_SCHEMA_TYPE, type DSVMetadataExternalSpecification, type DSVMetadataResourceDescriptor, type DSVMetadataSchemaRoot, type DSVMetadataSpecification } from "./schema.ts";
import { mimeToIriMap } from "./utils.ts";
import { ADMS, DSV, knownPrefixes, OWL, PROF } from "./vocabulary.ts";

/**
 * Converts DSV Metadata model to a string (JSON serializable) that can be
 * directly embedded into an HTML file. The reason why output is string is
 * because of the need to control spacing/formatting.
 *
 * The links are relative to the URL of the HTML document identified by
 * `rootHtmlDocumentIri`.
 */
export async function DSVMetadataToJsonLdString(
  specifications: Specification[],
  params: {
    /**
     * Resource Descriptor IRI that will be used in root.
     */
    rootHtmlDocumentIri: string;

    /**
     * Spacing parameter for JSON.stringify.
     */
    space?: string | number | undefined;

    /**
     * Normally, all URLs are made relative to the root HTML document URL. If
     * true, and URLs are HTTP(S), they will be kept absolute.
     *
     * @default false
     */
    useAbsoluteUrls?: boolean;
  },
): Promise<string> {
  let rootResource!: ResourceDescriptor;

  // Check that each specification has the root as one of its resources
  for (const spec of specifications) {
    const root = spec.resources.find((res) => res.iri === params.rootHtmlDocumentIri);
    if (!root) {
      throw new Error(
        `Specification ${spec.iri} does not have resource descriptor with IRI ${params.rootHtmlDocumentIri}, hence it will be impossible to embed it into the JSON-LD document.`,
      );
    }
    rootResource = root;
  }

  const parameters: Parameters = {
    rootUrl: rootResource.url,
    useAbsoluteUrls: params.useAbsoluteUrls ?? false,
  };

  let model = resourceDescriptorToJson(rootResource, parameters) as DSVMetadataSchemaRoot;

  model.inSpecificationOf = specifications.map((specification) => specificationToJson(specification, parameters));

  model = prefixIris(model, knownPrefixes);

  model["@context"] = context["@context"] ? context["@context"] : context;

  return JSON.stringify(model, null, params.space);
}

const SUFFIX_REGEX = /^[^\/#]{1,}$/;

interface Parameters {
  rootUrl: string;
  useAbsoluteUrls: boolean;
}

function prefixIris<T>(data: T, prefixesMap: { [prefix: string]: string }): T {
  if (typeof data === "string") {
    for (const [prefix, prefixValue] of Object.entries(prefixesMap)) {
      if (data.startsWith(prefixValue) && SUFFIX_REGEX.test(data.substring(prefixValue.length))) {
        (data as string) = data.replace(prefixValue, `${prefix}:`);
        break;
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => prefixIris(item, prefixesMap)) as T;
  }

  if (data === null || data === undefined) {
    return data;
  }

  for (const [key, value] of Object.entries(data) as [keyof T, unknown][]) {
    data[key] = prefixIris(data[key], prefixesMap);
  }
  return data;
}

/**
 * Creates a representation for Semantic Data Specification - Application
 * Profile or Vocabulary.
 */
function specificationToJson(specification: Specification, parameters: Parameters): DSVMetadataSpecification {
  const types = [];
  if (isApplicationProfile(specification)) {
    types.push(DSV.ApplicationProfile);
  }
  if (isVocabularySpecificationDocument(specification)) {
    types.push(OWL.Ontology);
  }

  const result: DSVMetadataSpecification = {
    [DSV_METADATA_SCHEMA_ID]: specification.iri,
    [DSV_METADATA_SCHEMA_TYPE]: [...types, PROF.Profile],

    // http://purl.org/dc/terms/title
    title: specification.title,
    // http://purl.org/dc/terms/description
    ...(Object.keys(specification.description).length ? { description: specification.description } : {}),
    // http://www.w3.org/ns/dx/prof/isProfileOf
    isProfileOf: specification.isProfileOf.map((externalSpecification) => externalSpecificationToJson(externalSpecification)),

    // http://www.w3.org/ns/dx/prof/hasResource
    hasResource: specification.resources.map((res) => resourceDescriptorToJson(res, parameters)),
  };

  if (specification.token) {
    // http://www.w3.org/ns/dx/prof/hasToken
    result.hasToken = specification.token;
  }

  return result;
}

/**
 * Creates a representation for Resource Descriptor - either general or
 * Application Profile Specification Document or Vocabulary Specification
 * Document.
 */
function resourceDescriptorToJson(model: ResourceDescriptor, parameters: Parameters): DSVMetadataResourceDescriptor {
  const result = {
    [DSV_METADATA_SCHEMA_ID]: model.iri,
    [DSV_METADATA_SCHEMA_TYPE]: [...(model.additionalRdfTypes ?? []), ADMS.AssetDistribution, PROF.ResourceDescriptor], // todo adms may be not needed

    // http://www.w3.org/ns/dx/prof/hasArtifact
    hasArtifact: pathRelative(parameters.rootUrl, model.url, parameters.useAbsoluteUrls),
    // http://www.w3.org/ns/dx/prof/hasRole
    hasRole: model.role,
    // http://purl.org/dc/terms/format
    format: model.formatMime ? (mimeToIriMap[model.formatMime] ?? model.formatMime) : undefined as any,
  } as DSVMetadataResourceDescriptor;

  if (model.conformsTo && model.conformsTo.length > 0) {
    // http://purl.org/dc/terms/conformsTo
    if (model.conformsTo.length === 1) {
      result.conformsTo = model.conformsTo[0];
    } else {
      result.conformsTo = model.conformsTo;
    }
  }

  return result;
}

/**
 * Creates a representation for used vocabulary = external profile.
 */
function externalSpecificationToJson(specification: ExternalSpecification): DSVMetadataExternalSpecification {
  const result: DSVMetadataExternalSpecification = {
    [DSV_METADATA_SCHEMA_ID]: specification.iri ?? undefined,
    title: specification.title ?? undefined,
    description: specification.description ?? undefined,

    hasResource: {
      hasArtifact: specification.url, // Use absolute URL here
    }
  };

  return result;
}
