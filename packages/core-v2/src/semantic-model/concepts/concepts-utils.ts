import type { EntityRecord } from "@dataspecer/core/entity-model";
import { Entity } from "../../entity-model/index.ts";
import { LOCAL_SEMANTIC_MODEL } from "../../model/known-models.ts";
import { isDataType } from "../datatypes/index.ts";
import {
    LanguageString,
    SemanticModelClass,
    SemanticModelGeneralization,
    SemanticModelRelationship,
    SemanticModelRelationshipEnd,
    type MainSemanticModelEntity,
} from "./concepts.ts";

export function isMainSemanticModelEntity(resource: Entity | null | undefined): resource is MainSemanticModelEntity {
    return resource?.type?.includes(LOCAL_SEMANTIC_MODEL) ?? false;
}

export function getMainEntity(entities: EntityRecord): MainSemanticModelEntity | null {
    return Object.values(entities).find(isMainSemanticModelEntity) ?? null;
}

export const SEMANTIC_MODEL_CLASS = "class"; // todo use proper IRI
export function isSemanticModelClass(resource: Entity | null): resource is SemanticModelClass {
    return resource?.type?.includes(SEMANTIC_MODEL_CLASS) ?? false;
}

export const SEMANTIC_MODEL_RELATIONSHIP = "relationship"; // todo use proper IRI
export function isSemanticModelRelationship(resource: Entity | null): resource is SemanticModelRelationship {
    return resource?.type?.includes(SEMANTIC_MODEL_RELATIONSHIP) ?? false;
}

export const SEMANTIC_MODEL_GENERALIZATION = "generalization"; // todo use proper IRI
export function isSemanticModelGeneralization(resource: Entity | null): resource is SemanticModelGeneralization {
    return resource?.type?.includes(SEMANTIC_MODEL_GENERALIZATION) ?? false;
}

export function isSemanticModelAttribute(resource: Entity | null): resource is SemanticModelRelationship {
    if (!isSemanticModelRelationship(resource)) {
        return false;
    }
    return isSemanticModelRelationPrimitive(resource);
}

export function isSemanticModelRelationPrimitive(resource: SemanticModelRelationship) {
    const isConceptAPrimitiveType = (concept: string | null) => {
        return concept == null || concept == "" || isDataType(concept) || resource.id.endsWith("#attribute"); // TODO: temporary workaround for SKOS #449
    };

    const conditionForEnds = (end1: SemanticModelRelationshipEnd, end2: SemanticModelRelationshipEnd) => {
        return (
            end1.iri == null &&
            isEmptyLanguageString(end1.name) &&
            isEmptyLanguageString(end1.description) &&
            isConceptAPrimitiveType(end2.concept)
        );
    };

    const [e1, e2] = resource.ends;

    if (!e1 || !e2) {
        return false;
    }

    return (
        resource.iri == null &&
        isEmptyLanguageString(resource.name) &&
        isEmptyLanguageString(resource.description) &&
        ((!conditionForEnds(e1, e2) && conditionForEnds(e2, e1)) ||
            (conditionForEnds(e1, e2) && !conditionForEnds(e2, e1)))
    );
}

const isEmptyLanguageString = (ls: LanguageString | null) => {
    if (!ls) {
        return true;
    }
    return Object.entries(ls).length == 0;
};
