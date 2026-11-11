import { describe, expect, it } from "vitest";
import { DefaultDataSpecificationConfiguration } from "@dataspecer/core/data-specification/configuration";
import { StructureModel, StructureModelClass, StructureModelSchemaRoot } from "../model/index.ts";
import { structureModelAddDefaultValues } from "./add-default-values.ts";

function classOf(require: boolean | null, restrict: boolean | null): StructureModelClass {
  const result = new StructureModelClass();
  result.requireRecommendedControlledVocabularyValue = require;
  result.restrictToRecommendedControlledVocabulary = restrict;
  return result;
}

function addDefaults(cls: StructureModelClass, require: boolean, restrict: boolean) {
  const root = new StructureModelSchemaRoot();
  root.classes.push(cls);
  const structure = new StructureModel();
  structure.roots.push(root);
  const [result] = structureModelAddDefaultValues(structure, {
    ...DefaultDataSpecificationConfiguration,
    requireRecommendedControlledVocabularyValue: require,
    restrictToRecommendedControlledVocabulary: restrict,
  }).getClasses();
  return [result.requireRecommendedControlledVocabularyValue, result.restrictToRecommendedControlledVocabulary];
}

describe("structureModelAddDefaultValues, recommended controlled vocabulary options", () => {

  it("Uses the default of the data specification when the class has no value.", () => {
    expect(addDefaults(classOf(null, null), true, true)).toStrictEqual([true, true]);
    expect(addDefaults(classOf(null, null), false, false)).toStrictEqual([false, false]);
  });

  it("Keeps the value of the class, also when it is false.", () => {
    expect(addDefaults(classOf(false, true), true, false)).toStrictEqual([false, true]);
  });

  it("Applies the default to each option on its own.", () => {
    expect(addDefaults(classOf(true, null), false, true)).toStrictEqual([true, true]);
  });

});
