import { ExtendedSemanticModelClass, SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship } from "../concepts/index.ts";
import { Entities } from "../../entity-model/index.ts";
import { PimAssociation, PimAssociationEnd, PimAttribute, PimClass } from "@dataspecer/core/pim/model";
import { CoreResource } from "@dataspecer/core/core";
import { SemanticModelEntity } from "../concepts/concepts.ts";

const GENERALIZATION_PREFIX = "https://dataspecer.com/semantic-models/generalization";

function getGeneralizationIri(fromIri: string, toIri: string): string {
    const url = new URLSearchParams({ fromIri, toIri });
    return GENERALIZATION_PREFIX + url.toString();
}

function createGeneralization(fromIri: string, toIri: string): SemanticModelGeneralization {
    return {
        id: getGeneralizationIri(fromIri, toIri),
        iri: null,
        type: ["generalization"],
        child: fromIri,
        parent: toIri,
    };
}

export function transformPimClass(cls: PimClass) {
    const result: Record<string, SemanticModelEntity> = {};

    const semanticClass = {
        id: cls.iri!,
        iri: cls.pimInterpretation ?? null,
        name: cls.pimHumanLabel ?? {},
        description: cls.pimHumanDescription ?? {},
        type: ["class"],
    } as SemanticModelClass & Partial<ExtendedSemanticModelClass>;

    result[cls.iri as string] = semanticClass;

    if (cls.pimIsCodelist) {
        semanticClass.isCodelist = true;
        semanticClass.codelistUrl = cls.pimCodelistUrl;
    }

    cls.pimExtends
        .map((to) => createGeneralization(cls.iri as string, to))
        .forEach((generalization) => (result[generalization.id] = generalization));

    return result;
}

export function transformCoreResources(resources: Record<string, CoreResource>, relationshipMapping: Record<string, [string, boolean]> = {}) {
    let result: Entities = {};

    // Transform classes
    for (const resource of Object.values(resources)) {
        if (PimClass.is(resource)) {
            // // Hotfix remove empty classes
            // if (!resource.pimHumanLabel || !Object.keys(resource.pimHumanLabel).length) {
            //     continue;
            // }
            // Hotfix remove owl:Thing
            if (resource.iri === "http://www.w3.org/2002/07/owl#Thing") {
                continue;
            }

            // Merge transform pim class into result
            result = { ...result, ...transformPimClass(resource) };
        }
        if (PimAssociation.is(resource)) {
            const left = resources[resource.pimEnd[0]!] as PimAssociationEnd;
            const right = resources[resource.pimEnd[1]!] as PimAssociationEnd;
            relationshipMapping[left.iri!] = [resource.iri!, true];
            relationshipMapping[right.iri!] = [resource.iri!, false];
            const association = {
                id: resource.iri as string,
                iri: null,
                type: ["relationship"],
                name: resource.pimHumanLabel ?? {},
                description: resource.pimHumanDescription ?? {},
                ends: [
                    {
                        cardinality: ((left.pimCardinalityMin ?? 0) === 0 && left.pimCardinalityMax === null) ? null : [left.pimCardinalityMin ?? 0, left.pimCardinalityMax],
                        name: left.pimHumanLabel ?? {},
                        description: left.pimHumanDescription ?? {},
                        concept: left.pimPart,
                        iri: null,
                    },
                    {
                        cardinality: [right.pimCardinalityMin ?? 0, right.pimCardinalityMax],
                        name: right.pimHumanLabel ?? resource.pimHumanLabel ?? {},
                        description: right.pimHumanDescription ?? resource.pimHumanDescription ?? {},
                        concept: right.pimPart,
                        iri: resource.pimInterpretation ?? null,
                    },
                ],
            } as SemanticModelRelationship;

            result[association.id] = association;

            // @ts-ignore
            const ext: string[] = resource["pimExtends"] ?? [];
            ext.map((to) => createGeneralization(association.id, to))
            .forEach((generalization) => (result[generalization.id] = generalization));
        }
        if (PimAttribute.is(resource)) {
            relationshipMapping[resource.iri!] = [resource.iri!, false];
            const attribute = {
                id: resource.iri as string,
                iri: null,
                type: ["relationship"],
                name: {},
                description: {},
                ends: [
                    {
                        cardinality: [0, null],
                        name: {},
                        description: {},
                        concept: resource.pimOwnerClass as string,
                    },
                    {
                        cardinality: [resource.pimCardinalityMin ?? 0, resource.pimCardinalityMax],
                        name: resource.pimHumanLabel ?? {},
                        description: resource.pimHumanDescription ?? {},
                        concept: resource.pimDatatype ?? "http://www.w3.org/2000/01/rdf-schema#Literal",
                        iri: resource.pimInterpretation ?? null,
                    },
                ],
            } as SemanticModelRelationship;

            result[attribute.id] = attribute;

            // @ts-ignore
            const ext: string[] = resource["pimExtends"] ?? [];
            ext.map((to) => createGeneralization(attribute.id, to))
            .forEach((generalization) => (result[generalization.id] = generalization));
        }
    }

    return result;
}
