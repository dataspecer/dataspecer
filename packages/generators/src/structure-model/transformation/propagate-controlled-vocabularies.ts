import {ConceptualModel} from "../../conceptual-model/index.ts";
import {StructureModel} from "../model/index.ts";
import {clone} from "@dataspecer/core/core";

/**
 * Add controlled vocabularies assigned to the class profiles from {@link ConceptualModel}.
 */
export function propagateControlledVocabularies(
  conceptual: ConceptualModel,
  structure: StructureModel
): StructureModel {
  const result = clone(structure) as StructureModel;
  for (const classData of result.getClasses()) {
    const conceptualClass = conceptual.classes[classData.pimIri];
    if (conceptualClass === null || conceptualClass === undefined) {
      continue;
    }
    classData.controlledVocabularies = clone(conceptualClass.controlledVocabularies) as typeof classData.controlledVocabularies;
  }
  return result;
}
