import {CoreResourceReader, CoreResourceWriter} from "../core/index.ts";
import {
    DataPsmAssociationEnd,
    DataPsmAttribute,
    DataPsmClass,
    DataPsmClassReference,
    DataPsmExternalRoot,
    DataPsmInclude,
    DataPsmOr,
    DataPsmSchema
} from "../data-psm/model/index.ts";
import * as PSM from "../data-psm/data-psm-vocabulary.ts";
import * as PIM from "../pim/pim-vocabulary.ts";
import {PimAssociation, PimAssociationEnd, PimAttribute, PimClass, PimSchema} from "../pim/model/index.ts";
import {PimDeleteAssociation, PimDeleteAttribute, PimDeleteClass, PimSetExtends} from "../pim/operation/index.ts";

// todo use memory store withou async
function getOwningPsmClass(store: CoreResourceReader, entityIri: string): DataPsmClass | null {
    const entities = store.listResourcesOfType(PSM.CLASS);
    for (const entity of entities) {
        const entityClass = store.readResource(entity) as DataPsmClass;
        if (entityClass.dataPsmParts.includes(entityIri)) {
            return entityClass;
        }
    }

    return null;
}

function getOwningPimAssociationForEnd(store: CoreResourceReader, associationEndIri: string): PimAssociation | null {
    const entities = store.listResourcesOfType(PIM.ASSOCIATION);
    for (const entity of entities) {
        const association = store.readResource(entity) as PimAssociation;
        if (association.pimEnd.includes(associationEndIri)) {
            return association;
        }
    }

    return null;
}

/**
 * Returns null or [descendant, ..., ..., ancestor]
 */
function getPimInheritanceChain(store: CoreResourceReader, descendant: string, ancestor: string): string[] | null {
    function recursive(entity: string, chain: string[] = []): string[] | null {
        chain.push(entity);

        if (entity === ancestor) {
            return chain; // success
        }

        const entityClass = store.readResource(entity) as PimClass;

        for (const parent of entityClass.pimExtends) {
            if (chain.includes(parent)) {
                continue; // cycle
            }
            const result = recursive(parent, chain);
            if (result !== null) {
                return result;
            }
        }

        chain.pop();
        return null;
    }

    return recursive(descendant);
}

interface GarbageCollectionReport {
    removedClasses: number;
    removedEntities: number;
}

/**
 * Removes all entities from a PIM schema that are not necessary for given PSM schemas.
 */
export function pimGarbageCollection(
    pim: CoreResourceReader & CoreResourceWriter,
    dataPsms: CoreResourceReader[],
): GarbageCollectionReport {
    // todo: create commit

    // PIM resource IRIs that shall be kept
    const keep = new Set<string>();

    // Traverse PSM schemas and find all PIM resources that are referenced and shall be kept
    for (const dataPsm of dataPsms) {
        const dataPsmSchemaIri = dataPsm.listResourcesOfType(PSM.SCHEMA)[0];
        const schema = dataPsm.readResource(dataPsmSchemaIri) as DataPsmSchema;
        if (schema === null) {
            throw new Error(`PSM schema ${dataPsmSchemaIri} not found.`);
        }
        const parts = schema.dataPsmParts;
        for (const part of parts) {
            const entity = dataPsm.readResource(part);
            if (entity === null) {
                throw new Error(`Entity ${part} not found, but was referenced from its schema ${dataPsmSchemaIri}.`);
            }

            if (DataPsmClass.is(entity)) {
                if (entity.dataPsmInterpretation) {
                    keep.add(entity.dataPsmInterpretation);
                }
            } else if (DataPsmAttribute.is(entity)) {
                if (entity.dataPsmInterpretation) {
                    keep.add(entity.dataPsmInterpretation);
                    const pimAttribute = pim.readResource(entity.dataPsmInterpretation) as PimAttribute;
                    const cls = getOwningPsmClass(dataPsm, entity.iri);
                    const chain = getPimInheritanceChain(pim, cls.dataPsmInterpretation, pimAttribute.pimOwnerClass);
                    chain.forEach(i => keep.add(i));
                }
            } else if (DataPsmAssociationEnd.is(entity)) {
                if (entity.dataPsmInterpretation) {
                    const pimAssociation = getOwningPimAssociationForEnd(pim, entity.dataPsmInterpretation);
                    const pimEnds = pimAssociation.pimEnd.map(i => pim.readResource(i) as PimAssociationEnd);
                    keep.add(pimAssociation.iri); // Association itself
                    pimEnds.forEach(i => keep.add(i.iri)); // With association ends
                    pimEnds.forEach(i => keep.add(i.pimPart)); // With associated classes

                    const domainPimEnd = pimEnds.find(i => i.iri !== entity.dataPsmInterpretation);
                    const rangePimEnd = pimEnds.find(i => i.iri === entity.dataPsmInterpretation);

                    const psmRange = dataPsm.readResource(entity.dataPsmPart);
                    const psmDomain = getOwningPsmClass(dataPsm, entity.iri);

                    const domainChain = getPimInheritanceChain(pim, psmDomain.dataPsmInterpretation, domainPimEnd.pimPart);
                    domainChain.forEach(i => keep.add(i));

                    if (DataPsmClass.is(psmRange)) {
                        const rangeChain = getPimInheritanceChain(pim, psmRange.dataPsmInterpretation, rangePimEnd.pimPart);
                        rangeChain.forEach(i => keep.add(i));
                    }
                    // todo implement other entities
                }
            } else if (DataPsmInclude.is(entity)) {
                // pass
            } else if (DataPsmClassReference.is(entity)) {
                // pass
            } else if (DataPsmExternalRoot.is(entity)) {
                entity.dataPsmTypes.forEach(i => keep.add(i));
            } else if (DataPsmOr.is(entity)) {
                // pass
            } else {
                throw new Error(`Unknown entity ${entity.iri} type.`);
            }
        }
    }

    const pimSchemaIri = pim.listResourcesOfType(PIM.SCHEMA)[0];
    const pimSchema = pim.readResource(pimSchemaIri) as PimSchema;
    let removedEntities = 0;

    const pimParts = [...pimSchema.pimParts];

    // Attributes
    for (const entityIri of pimParts) {
        const entity = pim.readResource(entityIri);
        if (!entity || !PimAttribute.is(entity)) {
            continue;
        }

        if (!keep.has(entity.iri)) {
            const op = new PimDeleteAttribute();
            op.pimAttribute = entity.iri;
            pim.applyOperation(op);
            removedEntities++;
        }
    }

    // Associations (and trivially association ends)
    for (const entityIri of pimParts) {
        const entity = pim.readResource(entityIri);
        if (!entity || !PimAssociation.is(entity)) {
            continue;
        }

        if (!keep.has(entity.iri)) {
            const op = new PimDeleteAssociation();
            op.pimAssociation = entity.iri;
            pim.applyOperation(op);
            removedEntities += 3; // Association and two ends
        }
    }

    // Class inheritance
    for (const entityIri of pimParts) {
        const entity = pim.readResource(entityIri);
        if (!entity || !PimClass.is(entity)) {
            continue;
        }

        const newExtends = entity.pimExtends.filter(i => keep.has(i));

        if (newExtends.length !== entity.pimExtends.length) {
            const op = new PimSetExtends();
            op.pimResource = entity.iri;
            op.pimExtends = newExtends;
            pim.applyOperation(op);
        }
    }

    // Classes
    let removedClasses = 0;
    for (const entityIri of pimParts) {
        const entity = pim.readResource(entityIri);
        if (!entity || !PimClass.is(entity)) {
            continue;
        }

        if (!keep.has(entity.iri)) {
            const op = new PimDeleteClass();
            op.pimClass = entity.iri;
            pim.applyOperation(op);
            removedClasses++;
            removedEntities++;
        }
    }

    return {removedClasses, removedEntities};
}
