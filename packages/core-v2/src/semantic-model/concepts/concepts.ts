import { Entity } from "../../entity-model/entity.ts";
import { SEMANTIC_MODEL_CLASS, SEMANTIC_MODEL_GENERALIZATION, SEMANTIC_MODEL_RELATIONSHIP } from "./concepts-utils.ts";
import { OrderedThing } from "./ordered-thing.ts";

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
}

/**
 * Represent classes, enumerations and simple data types.
 */
export interface SemanticModelClass extends NamedThing, SemanticModelEntity, OrderedThing {
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

export interface SemanticModelRelationshipEnd extends NamedThing, OrderedThing {
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
