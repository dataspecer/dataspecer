import type { EntityRecord } from "@dataspecer/core/entity-model";
import * as PIM from "@dataspecer/core/pim/pim-vocabulary";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship } from "../concepts/concepts-utils.ts";
import type { SemanticModelClass, SemanticModelGeneralization, SemanticModelRelationship } from "../concepts/concepts.ts";
import { isDataType } from "../datatypes/index.ts";

/**
 * Converts semantic model entities back to the PIM resources format.
 * This is the reverse of {@link transformCoreResources}.
 *
 * @param entities - The entity record from the semantic model state.
 * @param modelId - ID of the model's main entity (excluded from output).
 * @returns A record of PIM resources keyed by their IRI.
 */
export function buildPimResources(entities: EntityRecord, modelId: string): Record<string, object> {
  const result: Record<string, object> = {};

  // First pass: create PimClass objects (keyed by id for generalization update)
  const pimClasses: Record<string, { pimExtends: string[]; [key: string]: unknown }> = {};

  for (const entity of Object.values(entities)) {
    if (!entity || entity.id === modelId) continue;

    if (isSemanticModelClass(entity)) {
      const cls = entity as SemanticModelClass;
      const pimClass = {
        types: [PIM.CLASS],
        iri: cls.id,
        pimInterpretation: cls.iri,
        pimTechnicalLabel: null,
        pimHumanLabel: emptyToNull(cls.name),
        pimHumanDescription: emptyToNull(cls.description),
        pimExtends: [] as string[],
        pimIsCodelist: (cls as any).isCodelist ?? false,
        pimCodelistUrl: (cls as any).codelistUrl ?? [],
        pimRegex: null,
        pimExample: null,
        pimObjectExample: null,
      };
      pimClasses[cls.id] = pimClass;
      result[cls.id] = pimClass;
    }
  }

  // Second pass: embed generalizations into pimExtends on the child class
  for (const entity of Object.values(entities)) {
    if (!entity || entity.id === modelId) continue;

    if (isSemanticModelGeneralization(entity)) {
      const gen = entity as SemanticModelGeneralization;
      const childClass = pimClasses[gen.child];
      if (childClass) {
        childClass.pimExtends.push(gen.parent);
      }
    }
  }

  // Third pass: convert relationships
  for (const entity of Object.values(entities)) {
    if (!entity || entity.id === modelId) continue;

    if (isSemanticModelRelationship(entity)) {
      const rel = entity as SemanticModelRelationship;
      const leftEnd = rel.ends[0];
      const rightEnd = rel.ends[1];

      if (rightEnd?.concept && isDataType(rightEnd.concept)) {
        // Attribute: right end points to a datatype
        result[rel.id] = {
          types: [PIM.ATTRIBUTE],
          iri: rel.id,
          pimInterpretation: rightEnd.iri ?? null,
          pimTechnicalLabel: null,
          pimHumanLabel: emptyToNull(rightEnd.name),
          pimHumanDescription: emptyToNull(rightEnd.description),
          pimOwnerClass: leftEnd?.concept ?? null,
          pimDatatype: rightEnd.concept,
          pimCardinalityMin: rightEnd.cardinality?.[0] ?? null,
          pimCardinalityMax: rightEnd.cardinality?.[1] ?? null,
          pimLanguageStringRequiredLanguages: [],
          pimRegex: null,
          pimExample: null,
        };
      } else {
        // Association: both ends point to classes
        const leftEndIri = rel.id + "/end-0";
        const rightEndIri = rel.id + "/end-1";

        result[leftEndIri] = {
          types: [PIM.ASSOCIATION_END],
          iri: leftEndIri,
          pimInterpretation: null,
          pimTechnicalLabel: null,
          pimHumanLabel: emptyToNull(leftEnd?.name),
          pimHumanDescription: emptyToNull(leftEnd?.description),
          pimPart: leftEnd?.concept ?? null,
          pimCardinalityMin: leftEnd?.cardinality?.[0] ?? null,
          pimCardinalityMax: leftEnd?.cardinality?.[1] ?? null,
        };

        result[rightEndIri] = {
          types: [PIM.ASSOCIATION_END],
          iri: rightEndIri,
          pimInterpretation: null,
          pimTechnicalLabel: null,
          pimHumanLabel: emptyToNull(rightEnd?.name),
          pimHumanDescription: emptyToNull(rightEnd?.description),
          pimPart: rightEnd?.concept ?? null,
          pimCardinalityMin: rightEnd?.cardinality?.[0] ?? null,
          pimCardinalityMax: rightEnd?.cardinality?.[1] ?? null,
        };

        result[rel.id] = {
          types: [PIM.ASSOCIATION],
          iri: rel.id,
          pimInterpretation: rightEnd?.iri ?? null,
          pimTechnicalLabel: null,
          pimHumanLabel: emptyToNull(rel.name),
          pimHumanDescription: emptyToNull(rel.description),
          pimEnd: [leftEndIri, rightEndIri],
          pimIsOriented: false,
        };
      }
    }
  }

  return result;
}

function emptyToNull(ls: Record<string, string> | null | undefined): Record<string, string> | null {
  if (!ls || Object.keys(ls).length === 0) return null;
  return ls;
}
