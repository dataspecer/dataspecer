import {ConceptualModel} from "../../conceptual-model/index.ts";
import {clone} from "@dataspecer/core/core";
import {StructureModel} from "../model/index.ts";

/**
 * Add codelist information from {@link ConceptualModel}.
 */
export function structureModelAddCodelists(
  conceptual: ConceptualModel,
  structure: StructureModel
): StructureModel {
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();
  for (const structureClass of classes) {
    const conceptualClass = conceptual.classes[structureClass.pimIri];
    if (conceptualClass === null || conceptualClass === undefined) {
      continue;
    }
    structureClass.isCodelist = conceptualClass.isCodelist;
    structureClass.codelistUrl = [...(conceptualClass.codelistUrl ?? [])];
  }
  return result;
}
