import type { LanguageString } from "@dataspecer/core/core/core-resource";
import type { dsvMetadataWellKnown } from "./well-known.ts";

export interface Specification {
  types: string[];

  iri: string;

  title: LanguageString;
  description: LanguageString;

  /**
   * Preferred token for the specification (e.g. short name).
   */
  token?: string;

  /**
   * URLs of specifications that this specification is a profile of.
   */
  isProfileOf: ExternalSpecification[];

  resources: ResourceDescriptor[];
}

export const DSV_APPLICATION_PROFILE_TYPE = "ApplicationProfile";
export interface ApplicationProfile extends Specification {
  types: [typeof DSV_APPLICATION_PROFILE_TYPE];
}
export function isApplicationProfile(spec: Specification): spec is ApplicationProfile {
  return spec.types.includes(DSV_APPLICATION_PROFILE_TYPE);
}

export const DSV_VOCABULARY_SPECIFICATION_DOCUMENT_TYPE = "VocabularySpecificationDocument";
export interface VocabularySpecificationDocument extends Specification {
  types: [typeof DSV_VOCABULARY_SPECIFICATION_DOCUMENT_TYPE];
}
export function isVocabularySpecificationDocument(spec: Specification): spec is VocabularySpecificationDocument {
  return spec.types.includes(DSV_VOCABULARY_SPECIFICATION_DOCUMENT_TYPE);
}

export interface ResourceDescriptor {
  iri: string;
  url: string;

  /**
   * Format of the resource in mime type format, e.g. "application/ld+json".
   */
  formatMime?: keyof typeof dsvMetadataWellKnown.formatMime | string & {};

  role: keyof typeof dsvMetadataWellKnown.formatMime | string & {};

  conformsTo: string[];

  /**
   * Additional RDF types of the given resource descriptor.
   */
  additionalRdfTypes: string[];
}

/**
 * It is a combination of Specification and ResourceDescriptor
 */
export interface ExternalSpecification extends Partial<Specification>, Partial<ResourceDescriptor> {
  /**
   * Url where this specification can be found.
   */
  url: string;
}
