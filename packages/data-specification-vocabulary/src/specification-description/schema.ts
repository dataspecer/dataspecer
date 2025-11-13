import type { LanguageString } from "@dataspecer/core/core/core-resource";

export const DSV_METADATA_SCHEMA_ID = "@id";
export const DSV_METADATA_SCHEMA_TYPE = "@type";

export interface DSVMetadataSchemaRoot extends DSVMetadataResourceDescriptor {
  inSpecificationOf: DSVMetadataSpecification[];
  "@context": Record<string, any>;
}

export interface DSVMetadataSpecification {
  [DSV_METADATA_SCHEMA_ID]: string;
  [DSV_METADATA_SCHEMA_TYPE]: string[];

  title?: LanguageString;
  description?: LanguageString;

  hasToken?: string;

  isProfileOf: DSVMetadataExternalSpecification[];
  hasResource: DSVMetadataResourceDescriptor[];
}

/**
 * This is DSV "Semantic Data Specification", it can be further specialized into
 * an Application Profile or a Vocabulary.
 *
 * If the only known thing is an URL to a set of RDFs statements (a .ttl file),
 * then the Semantic Data Specification (Vocabulary in this case) is a blank
 * node and also the resource descriptor is a blank node.
 *
 * Furthermore, we need to distinguish between the specification document with
 * DSV metadata and simple .ttl file if no specification document is provided.
 */
export interface DSVMetadataExternalSpecification {
  [DSV_METADATA_SCHEMA_ID]?: string;

  title?: LanguageString;
  description?: LanguageString;

  /**
   * If the only known thing is an URL to a set of RDFs statements (a .ttl file).
   */
  hasResource: {
    [DSV_METADATA_SCHEMA_ID]?: string;
    hasArtifact: string | string[];
  }
}

export interface DSVMetadataResourceDescriptor {
  [DSV_METADATA_SCHEMA_ID]: string;
  [DSV_METADATA_SCHEMA_TYPE]: string[];

  hasArtifact: string | string[];
  hasRole: string;
  format: string;
  conformsTo?: string | string[];
}