import { describe, expect, it } from "vitest";
import { createHandlebarsAdapter } from "@dataspecer/handlebars-adapter";
import type { ConceptualModel } from "@dataspecer/generators/conceptual-model/model/conceptual-model";
import { StructureModel } from "@dataspecer/generators/structure-model/model/structure-model";
import type { ArtefactGeneratorContext } from "@dataspecer/generators/generator/artefact-generator-context";
import type { DataSpecificationArtefact } from "@dataspecer/core/data-specification/model/data-specification-artefact";
import { DefaultJsonConfiguration } from "../configuration.ts";
import { JsonSchema, JsonSchemaAny, JsonSchemaArray, JsonSchemaConst, JsonSchemaObject, JsonSchemaString, type JsonSchemaDefinition } from "../json-schema/json-schema-model.ts";
import { defaultJsonPartials, MAIN_JSON_PARTIAL } from "./configuration.ts";
import { createJsonSchemaViewModel } from "./view-adapter.ts";
import type { JsonSchemaArrayViewModel, JsonSchemaStringViewModel } from "./view-model.ts";

const PATTERN_A = "^http://example\\.com/cv-a/[a-z]+$";
const PATTERN_B = "^http://example\\.com/cv-b/[0-9]+$";

function iriString(): JsonSchemaString {
  return new JsonSchemaString("iri");
}

function stringWithPattern(pattern: string, vocabularyId: string | null = null): JsonSchemaString {
  const result = new JsonSchemaString(null);
  result.pattern = pattern;
  result.controlledVocabularyId = vocabularyId;
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

function viewModelOf(root: JsonSchemaDefinition) {
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

/**
 * Renders the documentation the way the documentation generator does, with the functions for the controlled
 * vocabularies that it provides. A vocabulary missing in `vocabularies` is not listed in the documentation.
 */
async function renderDocumentation(root: JsonSchemaDefinition, vocabularies: Record<string, string> = {}): Promise<string> {
  const adapter = createHandlebarsAdapter();
  const viewModel = {
    ...viewModelOf(root),
    artifact: { "json-schema": { relativePath: "schema.json" } },
    cvTitle: (id: string) => vocabularies[id] ?? "",
    cvAnchor: (id: string) => `cv-${id}`,
  };
  const html = await adapter.render(`{{> ${MAIN_JSON_PARTIAL}}}`, viewModel, defaultJsonPartials);
  return html.replace(/\s+/g, " ");
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


describe("view adapter of strings", () => {
  it("keeps the controlled vocabulary the pattern comes from", () => {
    const array = new JsonSchemaArray();
    array.items = stringWithPattern(PATTERN_A, "vocabulary-a");

    const items = (viewModelOf(array).root as JsonSchemaArrayViewModel).items as JsonSchemaStringViewModel;

    expect(items.pattern).toBe(PATTERN_A);
    expect(items.controlledVocabularyId).toBe("vocabulary-a");
  });

  it("has no controlled vocabulary for a pattern that does not come from one", () => {
    const array = new JsonSchemaArray();
    array.items = stringWithPattern(PATTERN_A);

    const items = (viewModelOf(array).root as JsonSchemaArrayViewModel).items as JsonSchemaStringViewModel;

    expect(items.controlledVocabularyId).toBeNull();
  });

  it("keeps the controlled vocabulary of a required item", () => {
    const view = viewModelOf(
      arrayRequiring(stringWithPattern(PATTERN_A, "vocabulary-a"), stringWithPattern(PATTERN_B, "vocabulary-b")),
    ).root as JsonSchemaArrayViewModel;

    expect(view.containsAll!.map((item) => (item as JsonSchemaStringViewModel).controlledVocabularyId)).toStrictEqual([
      "vocabulary-a",
      "vocabulary-b",
    ]);
  });
});

describe("documentation of items", () => {
  const VOCABULARIES = { "vocabulary-a": "CV A", "vocabulary-b": "CV B" };
  const LINK_A = '<a href="#cv-vocabulary-a">CV A</a>';

  it("describes every required item of an array with several rules", async () => {
    const html = await renderDocumentation(arrayRequiring(stringWithPattern(PATTERN_A), stringWithPattern(PATTERN_B)));

    expect(html).toContain("and must contain:");
    expect(html).toContain(PATTERN_A);
    expect(html).toContain(PATTERN_B);
    expect(html.match(/at least one item of type/g)).toHaveLength(2);
  });

  it("describes a single required item of a regular expression as before", async () => {
    const array = new JsonSchemaArray();
    array.items = iriString();
    array.contains = stringWithPattern(PATTERN_A);

    const html = await renderDocumentation(array);

    expect(html).toContain("must contain at least one item of type");
    expect(html).toContain(PATTERN_A);
    expect(html).not.toContain("controlled vocabulary");
  });

  it("names the controlled vocabulary of each required item and links it", async () => {
    const html = await renderDocumentation(
      arrayRequiring(stringWithPattern(PATTERN_A, "vocabulary-a"), stringWithPattern(PATTERN_B, "vocabulary-b")),
      VOCABULARIES,
    );

    expect(html).toContain(`at least one item of controlled vocabulary ${LINK_A} (type string, by regular expression: <code>${PATTERN_A}</code>)`);
    expect(html).toContain('at least one item of controlled vocabulary <a href="#cv-vocabulary-b">CV B</a> (type string');
    expect(html).not.toContain("at least one item of type");
  });

  it("names the controlled vocabulary of the only required item", async () => {
    const array = new JsonSchemaArray();
    array.items = iriString();
    array.contains = stringWithPattern(PATTERN_A, "vocabulary-a");

    const html = await renderDocumentation(array, VOCABULARIES);

    expect(html).toContain(`must contain at least one item of controlled vocabulary ${LINK_A} (type string, by regular expression`);
  });

  it("names the controlled vocabulary of the values of an array", async () => {
    const array = new JsonSchemaArray();
    const items = new JsonSchemaString("iri");
    items.pattern = PATTERN_A;
    items.controlledVocabularyId = "vocabulary-a";
    array.items = items;

    const html = await renderDocumentation(array, VOCABULARIES);

    expect(html).toContain(`array of values <code>{0..*}</code> of controlled vocabulary ${LINK_A} (type string, format: <code>iri</code>, by regular expression: <code>${PATTERN_A}</code>)`);
  });

  it("names the controlled vocabulary of a property with one value", async () => {
    const object = new JsonSchemaObject();
    const value = new JsonSchemaString("iri");
    value.pattern = PATTERN_A;
    value.controlledVocabularyId = "vocabulary-a";
    object.properties.must_a_single = value;

    const html = await renderDocumentation(object, VOCABULARIES);

    expect(html).toContain(`optional item of controlled vocabulary ${LINK_A} (type string, format: <code>iri</code>`);
  });

  it("keeps a regular expression that does not come from a controlled vocabulary", async () => {
    const array = new JsonSchemaArray();
    const items = new JsonSchemaString("iri");
    items.pattern = PATTERN_A;
    array.items = items;

    const html = await renderDocumentation(array, VOCABULARIES);

    expect(html).toContain("of type string");
    expect(html).toContain(PATTERN_A);
    expect(html).not.toContain("controlled vocabulary");
  });

  it("distinguishes the controlled vocabulary from the regular expression of the class in a list of rules", async () => {
    const array = new JsonSchemaArray();
    const items = new JsonSchemaString("iri");
    items.allOf = [stringWithPattern("^http://example\\.com/"), stringWithPattern(PATTERN_A, "vocabulary-a")];
    array.items = items;

    const html = await renderDocumentation(array, VOCABULARIES);

    expect(html).toContain("<li> string (by regular expression: <code>^http://example\\.com/</code>)");
    expect(html).toContain(`<li>controlled vocabulary ${LINK_A} (type string, by regular expression: <code>${PATTERN_A}</code>)`);
  });

  it("shows the id of a controlled vocabulary that is not listed without a link", async () => {
    const array = new JsonSchemaArray();
    array.items = iriString();
    array.contains = stringWithPattern(PATTERN_A, "vocabulary-x");

    const html = await renderDocumentation(array, VOCABULARIES);

    expect(html).toContain("of controlled vocabulary <code>vocabulary-x</code> (type string");
    expect(html).not.toContain("#cv-vocabulary-x");
  });
});
