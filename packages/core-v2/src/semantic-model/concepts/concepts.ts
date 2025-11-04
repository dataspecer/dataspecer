import { Entity } from "../../entity-model/entity.ts";
import { SEMANTIC_MODEL_CLASS, SEMANTIC_MODEL_GENERALIZATION, SEMANTIC_MODEL_RELATIONSHIP } from "./concepts-utils.ts";

/**
 * A human text that is translated into multiple languages.
 *
 * Keys are ISO 639-1 language codes.
 */
export type LanguageString = { [key: string]: string };

export interface SemanticModelEntity extends Entity {
    /**
     * Public, usually globally-recognised, identifier of the entity.
     * The value may be null indicating that the entity has no public IRI.
     * @example http://xmlns.com/foaf/0.1/Person
     *
     * IRI may be relative to the base IRI of the model.
     */
    iri: string | null;
}

export interface NamedThing {
    name: LanguageString;
    //alias: LanguageString[];
    description: LanguageString;

    /**
     * IRI of the predicate used to load the name from RDF (e.g., rdfs:label or skos:prefLabel).
     * This is used to correctly export reusesPropertyValue in DSV.
     * @optional
     */
    nameIri?: string | null;

    /**
     * IRI of the predicate used to load the description from RDF (e.g., rdfs:comment or skos:definition).
     * This is used to correctly export reusesPropertyValue in DSV.
     * @optional
     */
    descriptionIri?: string | null;
}

/**
 * Represent classes, enumerations and simple data types.
 */
export interface SemanticModelClass extends NamedThing, SemanticModelEntity {
    type: [typeof SEMANTIC_MODEL_CLASS];

    // todo: is it class, enumeration, datatype, code list, ...

    /**
     * URL of external documentation.
     *
     * The URL can be absolute or relative.
     *
     * This value is optional as it can be missing in the source data.
     * You should not set the value to undefined manually.
     * Use null to indicate an absence of a value.
     */
    externalDocumentationUrl?: string | null;
}

/**
 * Represents attributes and associations.
 */
export interface SemanticModelRelationship extends NamedThing, SemanticModelEntity {
    type: [typeof SEMANTIC_MODEL_RELATIONSHIP];

    ends: SemanticModelRelationshipEnd[];

    // todo: is it attribute or association
}

export interface SemanticModelRelationshipEnd extends NamedThing {
    iri: string | null;
    cardinality?: [number, number | null];

    /** {@link SemanticModelClass} */
    concept: string | null;

    /**
     * URL of external documentation.
     *
     * The URL can be absolute or relative.
     *
     * This value is optional as it can be missing in the source data.
     * You should not set the value to undefined manually.
     * Use null to indicate an absence of a value.
     */
    externalDocumentationUrl?: string | null;
}

/**
 * Inheritance hierarchy.
 */
export interface SemanticModelGeneralization extends SemanticModelEntity {
    type: [typeof SEMANTIC_MODEL_GENERALIZATION];

    /** {@link SemanticModelClass} */
    child: string;

    /** {@link SemanticModelClass} */
    parent: string;
}
