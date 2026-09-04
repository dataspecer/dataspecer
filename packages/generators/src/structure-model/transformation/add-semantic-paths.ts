import { ConceptualModel, ConceptualModelClass } from "../../conceptual-model/index.ts";
import { clone } from "@dataspecer/core/core";
import {
  SemanticPathStep,
  SemanticPathStepClass,
  SemanticPathStepGeneralization,
  SemanticPathStepProperty,
  StructureModel,
} from "../model/index.ts";

export function addSemanticPaths(conceptual: ConceptualModel, structure: StructureModel): StructureModel {
  const result = clone(structure) as StructureModel;
  const classes = result.getClasses();

  for (const classData of classes) {
    const conceptualClass = conceptual.classes[classData.pimIri];
    if (!conceptualClass) {
      // todo: This makes issues when re-using structure models
      continue;
    }
    for (const property of classData.properties) {
      const pathToPropertyEnd: SemanticPathStep[] = [];

      function traverseHierarchy(conceptualClass: ConceptualModelClass): boolean {
        const foundProperty = conceptualClass.properties.find((p) => p.pimIri === property.pimIri);
        if (foundProperty) {
          return true;
        }

        for (const generalClass of conceptualClass.extends) {
          pathToPropertyEnd.push({
            type: "generalization",
          } satisfies SemanticPathStepGeneralization);
          pathToPropertyEnd.push({
            type: "class",
            class: generalClass,
          } satisfies SemanticPathStepClass);

          if (traverseHierarchy(generalClass)) {
            return true;
          }

          pathToPropertyEnd.pop();
        }

        return false;
      }
      traverseHierarchy(conceptualClass);

      const propertyStartConceptualClass =
        (pathToPropertyEnd[pathToPropertyEnd.length - 1] as SemanticPathStepClass | undefined)?.class ??
        conceptualClass;
      const conceptualProperty =
        propertyStartConceptualClass.properties.find((p) => p.pimIri === property.pimIri) ?? null;

      pathToPropertyEnd.push({
        type: "property",
        property: conceptualProperty,
      } satisfies SemanticPathStepProperty);

      property.semanticPath = pathToPropertyEnd;

      for (const dataType of property.dataTypes) {
        if (!dataType.isAssociation()) {
          continue;
        }

        const conceptualEndClass = conceptual.classes[dataType.dataType.pimIri];

        // todo: support for child classes if replaced by specialization
        dataType.semanticPath = [
          {
            type: "class",
            class: conceptualEndClass,
          } satisfies SemanticPathStepClass,
        ];
      }
    }
  }

  return result;
}
