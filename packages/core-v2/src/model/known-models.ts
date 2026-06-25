/**
 * Represents a model that is a directory for organizing other models. The root
 * package then represents a project. Sub-packages are for imported
 * specifications. They can also be used for organizing models into
 * sub-projects.
 */
export const LOCAL_PACKAGE = "http://dataspecer.com/resources/local/package";

/**
 * Visual model that instructs how to render semantic entities on the canvas.
 */
export const VISUAL_MODEL = "http://dataspecer.com/resources/local/visual-model";

/**
 * Represents a model that can be freely edited and contains classes, relations
 * and generalizations in case of vocabulary or their profiles.
 */
export const LOCAL_SEMANTIC_MODEL = "http://dataspecer.com/resources/local/semantic-model";
export const API_SPECIFICATION_MODEL = "http://dataspecer.com/resources/local/api-specification";
export const APPLICATION_GRAPH = "http://dataspecer.com/resources/local/application-graph";

/**
 * Model that can be queried. Currently used only for SGOV, hence the iri.
 */
export const QUERYABLE_MODEL = "https://dataspecer.com/core/model-descriptor/sgov";

/**
 * Model that has a list of URLs that can be fetched as vocabulary.
 */
export const RDFS_MODEL = "https://dataspecer.com/core/model-descriptor/pim-store-wrapper";

// Old models from core@v1
export const V1 = {
    /** @deprecated */
    CIM: "http://dataspecer.com/resources/v1/cim",
    /** @deprecated */
    PIM: "http://dataspecer.com/resources/v1/pim",

    /**
     * Structural model that maps the semantic model to the desired shape.
     */
    PSM: "http://dataspecer.com/resources/v1/psm",

    /**
     * Model containing configuration for individual generators as well as the
     * global configuration such as base url.
     */
    GENERATOR_CONFIGURATION: "http://dataspecer.com/resources/v1/generator-configuration",
};