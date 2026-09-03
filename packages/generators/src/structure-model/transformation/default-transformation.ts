import { ConceptualModel } from "../../conceptual-model/index.ts";
import { propagateCardinality } from "./propagate-cardinality.ts";
import { structureModelAddCodelists } from "./add-codelists.ts";
import { structureModelFlattenInheritance } from "./instantiate-properties.ts";
import { structureModelDematerialize } from "./dematerialize.ts";
import { propagateLabel } from "./propagate-label.ts";
import { DataSpecification } from "@dataspecer/core/data-specification/model";
import { addDataSpecification } from "./add-data-specification.ts";
import { propagateCimIri } from "./propagate-cim-iri.ts";
import { StructureModel } from "../model/index.ts";
import { propagateReverse } from "./propagate-reverse.ts";
import { propagateRegex } from "./propagate-regex.ts";
import { propagateExample } from "./propagate-example.ts";
import { propagateLanguageStringRequiredLanguages } from "./propagate-language-string-required-languages.ts";
import { addSemanticPaths } from "./add-semantic-paths.ts";

type ConceptualTransformation = (
  conceptualModel: ConceptualModel,
  structureModel: StructureModel
) => StructureModel;

type StructureTransformation = (
  structureModel: StructureModel
) => StructureModel;

/**
 * Default transformation pipeline at the conceptual level.
 */
export const defaultConceptualTransformations: ConceptualTransformation[] = [
  structureModelAddCodelists,
  propagateCardinality,
  structureModelAddCodelists,
  propagateLabel,
  propagateCimIri,
  propagateReverse,
  propagateRegex,
  propagateExample,
  propagateLanguageStringRequiredLanguages,
  addSemanticPaths,
];

/**
 * Default transformation pipeline at the structure level.
 */
export const defaultStructureTransformations: StructureTransformation[] = [
  structureModelFlattenInheritance,
  structureModelDematerialize,
];

/**
 * Apply all transformations.
 */
export function transformStructureModel(
  conceptualModel: ConceptualModel,
  structureModel: StructureModel,
  specifications: DataSpecification[] | null = null,
  conceptualTransformations: ConceptualTransformation[] | null = null,
  structureTransformations: StructureTransformation[] | null = null
): StructureModel {
  let result = structureModel;
  // Conceptual level first.
  conceptualTransformations ??= defaultConceptualTransformations;
  for (const conceptualTransformation of conceptualTransformations) {
    result = conceptualTransformation(conceptualModel, result);
  }
  // Next just structure transformations..
  structureTransformations ??= defaultStructureTransformations;
  for (const structureTransformation of structureTransformations) {
    result = structureTransformation(result);
  }
  // Optional.
  if (specifications !== null) {
    result = addDataSpecification(result, specifications);
  }
  return result;
}
