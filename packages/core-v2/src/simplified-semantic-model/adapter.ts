import { NamedThing, SEMANTIC_MODEL_CLASS, SEMANTIC_MODEL_GENERALIZATION, SEMANTIC_MODEL_RELATIONSHIP, SemanticModelClass, SemanticModelEntity, SemanticModelGeneralization, SemanticModelRelationship, SemanticModelRelationshipEnd, isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "../semantic-model/concepts/index.ts";
import { getDomainAndRange } from "../semantic-model/relationship-utils/index.ts";
import { Cardinality, SimplifiedSemanticModel } from "./schema.ts";
import { v4 as uuidv4 } from "uuid";

interface Context {

}

function getResourceIdentifier(resource: SemanticModelEntity): string {
    return resource.iri ?? resource.id;
}

function reverseGetResourceIdentifier(iriOrId: string, originalSemanticModel: SemanticModelEntity[]): SemanticModelEntity | null {
    return originalSemanticModel.find(entity => entity.iri === iriOrId) ?? originalSemanticModel.find(entity => entity.id === iriOrId) ?? null;
}

function getResourceTitle(resource: NamedThing): string {
    return resource.name.en ?? "";
}

function getResourceDescription(resource: NamedThing): string {
    return resource.description.en ?? "";
}

function getCardinality(cardinality: [number, number | null]): Cardinality {
    if (!cardinality) {
        return "many";
    }

    if (cardinality[0] === 0 && cardinality[1] === 1) {
        return "optional-one";
    } else if (cardinality[0] === 1 && cardinality[1] === 1) {
        return "one";
    } else {
        return "many";
    }
}

function getCardinalityArray(cardinality: Cardinality): [number, number | null] {
    switch (cardinality) {
        case "one":
            return [1, 1];
        case "optional-one":
            return [0, 1];
        default:
            return [0, null];
    }
}

export function semanticModelToSimplifiedSemanticModel(semanticModel: Record<string, SemanticModelEntity>, context: Context): SimplifiedSemanticModel {
    const entities = Object.values(semanticModel);

    const classes = entities.filter(isSemanticModelClass).map(cls => ({
        iri: getResourceIdentifier(cls),
        title: getResourceTitle(cls),
        description: getResourceDescription(cls),
    }));
    const classIris = classes.map(cls => cls.iri);

    const generalizations = entities.filter(isSemanticModelGeneralization).map(gen => ({
        iri: getResourceIdentifier(gen),
        title: "",
        description: "",
        generalClass: getResourceIdentifier(semanticModel[gen.parent]!),
        specialClass: getResourceIdentifier(semanticModel[gen.child]!),
    }));

    const allRelationships = [];
    for (const relationship of entities.filter(isSemanticModelRelationship)) {
        const domainAndRange = getDomainAndRange(relationship);
        if (!domainAndRange) {
            continue;
        }
        const {domain, range} = domainAndRange;

        let domainIri = "";
        if (domain.concept) {
            const domainEntity = semanticModel[domain.concept];
            domainIri = domainEntity ? getResourceIdentifier(domainEntity) : domain.concept;
        }

        let rangeIri = "";
        if (range.concept) {
            const rangeEntity = semanticModel[range.concept];
            rangeIri = rangeEntity ? getResourceIdentifier(rangeEntity) : range.concept;
        }

        allRelationships.push({
            iri: range.iri!,
            title: getResourceTitle(range),
            description: getResourceDescription(range),
            domain: domainIri,
            domainCardinality: getCardinality(domain.cardinality!),
            range: rangeIri,
            rangeCardinality: getCardinality(range.cardinality!),
        });
    };

    return {
        // @ts-ignore
        "$schema": "https://schemas.dataspecer.com/adapters/simplified-semantic-model.v1.0.schema.json",
        classes,
        attributes: allRelationships.filter(r => !classIris.includes(r.range)),
        relationships: allRelationships.filter(r => classIris.includes(r.range)),
        generalizations,
    };
}

export function simplifiedSemanticModelToSemanticModel(simplifiedSemanticModel: SimplifiedSemanticModel, semanticModel: Record<string, SemanticModelEntity>): Record<string, SemanticModelEntity> {
    const orig = Object.values(semanticModel);

    const classes: SemanticModelClass[] = simplifiedSemanticModel.classes.map(cls => {
        const entity = reverseGetResourceIdentifier(cls.iri, orig) as SemanticModelClass | null;

        return {
            id: entity?.id ?? uuidv4(),
            iri: cls.iri,
            type: [SEMANTIC_MODEL_CLASS],
            name: {...entity?.name, en: cls.title},
            description: {...entity?.description, en: cls.description},
        };
    });

    const generalizations: SemanticModelGeneralization[] = simplifiedSemanticModel.generalizations.map(gen => {
        const entity = reverseGetResourceIdentifier(gen.iri, orig);
        return {
            id: entity?.id ?? uuidv4(),
            iri: gen.iri,
            type: [SEMANTIC_MODEL_GENERALIZATION],
            child: reverseGetResourceIdentifier(gen.specialClass, classes)?.id ?? gen.specialClass,
            parent: reverseGetResourceIdentifier(gen.generalClass, classes)?.id ?? gen.generalClass,
        };
    });

    const relationships: SemanticModelRelationship[] = simplifiedSemanticModel.attributes.concat(simplifiedSemanticModel.relationships).map(rel => {
        const existing = orig.filter(isSemanticModelRelationship).find(entity => entity.ends.some(e => e.iri === rel.iri)) as SemanticModelRelationship | null;

        const domainId = rel.domain ? reverseGetResourceIdentifier(rel.domain, classes)?.id ?? rel.domain : null;
        const targetId = rel.range ? reverseGetResourceIdentifier(rel.range, classes)?.id ?? rel.range : null;

        let origDomain: SemanticModelRelationshipEnd | null = null;
        let origRange: SemanticModelRelationshipEnd | null = null;
        let isDomainFirst = true;
        if (existing) {
            const domainAndRange = getDomainAndRange(existing);
            if (domainAndRange) {
                origDomain = domainAndRange.domain;
                origRange = domainAndRange.range;
                isDomainFirst = domainAndRange.domainIndex === 0;
            }
        }

        const domainEnd = {
            iri: null,
            cardinality: getCardinalityArray(rel.domainCardinality),
            concept: domainId,
            name: origDomain?.name ?? {},
            description: origDomain?.description ?? {},
        };
        const rangeEnd = {
            iri: rel.iri,
            cardinality: getCardinalityArray(rel.rangeCardinality),
            concept: targetId,
            name: {...origRange?.name, en: rel.title},
            description: {...origRange?.description, en: rel.description},
        };

        let ends = isDomainFirst ? [domainEnd, rangeEnd] : [rangeEnd, domainEnd];

        return {
            id: existing?.id ?? uuidv4(),
            iri: existing?.iri ?? null,
            type: [SEMANTIC_MODEL_RELATIONSHIP],
            name: {}, // By definition of the one-directional relationship
            description: {}, // By definition of the one-directional relationship
            ends
        };
    });

    const newEntities = [...generalizations, ...classes, ...relationships];
    return Object.fromEntries(newEntities.map(entity => [entity.id, entity]));
}