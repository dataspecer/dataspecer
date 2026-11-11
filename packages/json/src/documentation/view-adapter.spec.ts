import { describe, expect, it } from "vitest";
import { createHandlebarsAdapter } from "@dataspecer/handlebars-adapter";
import type { ConceptualModel } from "@dataspecer/generators/conceptual-model/model/conceptual-model";
import { StructureModel } from "@dataspecer/generators/structure-model/model/structure-model";
import type { ArtefactGeneratorContext } from "@dataspecer/generators/generator/artefact-generator-context";
import type { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";
import { DefaultJsonConfiguration } from "../configuration.ts";
import { JsonSchema, JsonSchemaAny, JsonSchemaArray, JsonSchemaConst, JsonSchemaString } from "../json-schema/json-schema-model.ts";
import { defaultJsonPartials, MAIN_JSON_PARTIAL } from "./configuration.ts";
import { createJsonSchemaViewModel } from "./view-adapter.ts";
import type { JsonSchemaArrayViewModel, JsonSchemaStringViewModel } from "./view-model.ts";

const PATTERN_A = "^http://example\\.com/cv-a/[a-z]+$";
const PATTERN_B = "^http://example\\.com/cv-b/[0-9]+$";

function iriString(): JsonSchemaString {
  return new JsonSchemaString("iri");
}

function stringWithPattern(pattern: string): JsonSchemaString {
  const result = new JsonSchemaString(null);
  result.pattern = pattern;
  return result;
}

/**
 * Array of IRIs where every entry of `contains` is a separate rule requiring an item, the way the JSON Schema
 * generator writes several "at least one" rules.
 */
function arrayRequiring(...rules: JsonSchemaString[]): JsonSchemaArray {
  const result = new JsonSchemaArray();
  result.items = iriString();
  for (const rule of rules) {
    const subArray = new JsonSchemaArray();
    subArray.items = new JsonSchemaAny();
    subArray.contains = rule;
    result.allOf.push(subArray);
  }
  return result;
}

function viewModelOf(root: JsonSchemaArray) {
  const jsonSchema = new JsonSchema();
  jsonSchema.root = root;
  const structureModel = new StructureModel();
  structureModel.humanLabel = { en: "Test" };
  structureModel.technicalLabel = "test";
  return createJsonSchemaViewModel({
    structureModel,
    conceptualModel: { classes: {} } as unknown as ConceptualModel,
    jsonSchema,
    configuration: DefaultJsonConfiguration,
    context: {} as ArtefactGeneratorContext,
    artefact: {} as DataSpecificationArtefact,
    languages: ["en"],
  });
}

async function renderDocumentation(root: JsonSchemaArray): Promise<string> {
  const adapter = createHandlebarsAdapter();
  const viewModel = { ...viewModelOf(root), artifact: { "json-schema": { relativePath: "schema.json" } } };
  return adapter.render(`{{> ${MAIN_JSON_PARTIAL}}}`, viewModel, defaultJsonPartials);
}

describe("view adapter of arrays", () => {
  it("lists every rule requiring an item next to the array", () => {
    const { root } = viewModelOf(arrayRequiring(stringWithPattern(PATTERN_A), stringWithPattern(PATTERN_B)));
    const array = root as JsonSchemaArrayViewModel;

    expect(array.containsAll).toHaveLength(2);
    expect((array.containsAll![0] as JsonSchemaStringViewModel).pattern).toBe(PATTERN_A);
    expect((array.containsAll![1] as JsonSchemaStringViewModel).pattern).toBe(PATTERN_B);
    expect(array.allOf).toBeNull();
    expect(array.requiresStringConstantsOnly).toBeNull();
  });

  it("keeps the rules that restrict more than the presence of an item in allOf", () => {
    const array = arrayRequiring(stringWithPattern(PATTERN_A));
    const limited = new JsonSchemaArray();
    limited.items = new JsonSchemaAny();
    limited.contains = stringWithPattern(PATTERN_B);
    limited.maxItems = 2;
    array.allOf.push(limited);

    const view = viewModelOf(array).root as JsonSchemaArrayViewModel;

    expect(view.containsAll).toHaveLength(1);
    expect(view.allOf).toHaveLength(1);
    expect((view.allOf![0] as JsonSchemaArrayViewModel).maxItems).toBe(2);
  });

  it("has no list of required items when the array does not require any", () => {
    const array = new JsonSchemaArray();
    array.items = iriString();

    const view = viewModelOf(array).root as JsonSchemaArrayViewModel;

    expect(view.containsAll).toBeNull();
    expect(view.allOf).toBeNull();
  });

  it("still reports required string constants", () => {
    const array = new JsonSchemaArray();
    array.items = iriString();
    for (const value of ["a", "b"]) {
      const subArray = new JsonSchemaArray();
      subArray.items = new JsonSchemaAny();
      subArray.contains = new JsonSchemaConst();
      (subArray.contains as JsonSchemaConst).value = value;
      array.allOf.push(subArray);
    }

    const view = viewModelOf(array).root as JsonSchemaArrayViewModel;

    expect(view.requiresStringConstantsOnly).toEqual(['"a"', '"b"']);
  });
});

