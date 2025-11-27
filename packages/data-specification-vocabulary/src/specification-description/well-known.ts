/**
 * List of well known constants for DSV metadata.
 */
export const dsvMetadataWellKnown = {
  /**
   * List of common MIME types that are used in DSV metadata.
   */
  formatMime: {
    turtle: "text/turtle",
    svg: "image/svg+xml",
    html: "text/html",

    jsonSchema: "application/schema+json",
    jsonLd: "application/ld+json",
  },

  /**
   * List of roles that are used in DSV metadata.
   */
  role: {
    /**
     * Documents, in human-readable form, how to use the profile.
     *
     * Many existing profiles treat their human-readable forms (PDF documents
     * etc.) as authoritative. This role is suggestive of non-authoritativeness.
     * For a role for a human-readable resource that is authoritative, see
     * role:Specification.
     */
    guidance: "http://www.w3.org/ns/dx/prof/role/guidance",

    /**
     * Defining the profile in human-readable form.
     *
     * This role indicates authoritativeness. For a role for a human-readable
     * resource that is not authoritative, see role:Guidance.
     */
    specification: "http://www.w3.org/ns/dx/prof/role/specification",

    /**
     * Defines terms used in the profile specification.
     */
    vocabulary: "http://www.w3.org/ns/dx/prof/role/vocabulary",

    /**
     * Machine-readable structural descriptions of data defined by the profile.
     */
    schema: "http://www.w3.org/ns/dx/prof/role/schema",

    /**
     * Descriptions of obligations, limitations or extensions that the profile defines.
     *
     * Use this Role when you want to indicate the constraints that the associated Profile imposes on top of base specifications
     */
    constraints: "http://www.w3.org/ns/dx/prof/role/constraints",
  },

  /**
   * List of specifications that are used in DSV metadata.
   */
  conformsTo: {
    svg: "https://www.w3.org/TR/SVG/",
    jsonSchema: "https://json-schema.org/draft/2020-12/schema",
    jsonLd: "http://www.w3.org/ns/json-ld",
    owl: "http://www.w3.org/2002/07/owl",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",

    profProfile: "http://www.w3.org/ns/dx/prof/Profile",

    /**
     * Represents our (Dataspecer's own) description of application profile.
     */
    dsvApplicationProfile: "https://w3id.org/dsv#ApplicationProfile",

    /**
     * Represents our (Dataspecer's own) structural description of single structure.
     */
    dsvStructure: "https://w3id.org/dsv#Structure",

    /**
     * URL to SHACL specification documentation.
     */
    shacl: "https://www.w3.org/TR/shacl/",
  },

  /**
   * Additional RDF types that resource descriptors can have.
   */
  additionalRdfTypes: {
    ApplicationProfileSpecificationDocument: "https://w3id.org/dsv#ApplicationProfileSpecificationDocument",
    VocabularySpecificationDocument: "https://w3id.org/dsv#VocabularySpecificationDocument",
  },
};
