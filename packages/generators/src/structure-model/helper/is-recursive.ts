import {StructureModel, StructureModelClass} from "../model/index.ts";

/**
 * Checks if the structure is infinitely recursive
 * @param structureModel
 */
export function isRecursive(
    structureModel: StructureModel
): boolean {
    for (const root of structureModel.roots) {
        for (const cls of root.classes) {
            if (DfsIsRecursive(cls, [])) {
                return true;
            }
        }
    }

    return false;
}

function DfsIsRecursive(cls: StructureModelClass, iriChain: string[]): boolean {
    const iri = cls.psmIri;
    if (iriChain.includes(iri)) {
        return true;
    }

    iriChain.push(iri);

    for (const property of cls.properties) {
        for (const dataType of property.dataTypes) {
            if (dataType.isAssociation()) {
                if (DfsIsRecursive(dataType.dataType, iriChain)) {
                    iriChain.pop();
                    return true;
                }
            }
        }
    }
    for (const parent of cls.extends) {
        if (DfsIsRecursive(parent, iriChain)) {
            iriChain.pop();
            return true;
        }
    }

    iriChain.pop();
    return false;
}
