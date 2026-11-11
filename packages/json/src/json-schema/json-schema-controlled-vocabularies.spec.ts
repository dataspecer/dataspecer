import { describe, expect, it } from "vitest";
import { DataSpecification, DataSpecificationArtefact } from "@dataspecer/core/data-specification/model";
import { MemoryOutputStream } from "@dataspecer/core/io/stream/memory-output-stream";
import type { Qualifier } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { ConceptualModelControlledVocabularyAssignment } from "@dataspecer/generators/conceptual-model/model";
import {
  StructureModel,
  StructureModelClass,
  StructureModelComplexType,
  StructureModelPrimitiveType,
  StructureModelProperty,
  StructureModelSchemaRoot,
} from "@dataspecer/generators/structure-model/model";
import { DefaultJsonConfiguration } from "../configuration.ts";
import { structureModelAddIdAndTypeProperties } from "./json-id-transformations.ts";
import { structureModelToJsonSchema } from "./json-schema-model-adapter.ts";
import { JsonSchema, JsonSchemaArray, JsonSchemaObject, JsonSchemaString } from "./json-schema-model.ts";
import { writeJsonSchema } from "./json-schema-writer.ts";

type Json = any;

function assignment(qualifier: Qualifier, pattern: string | null, vocabularyId = "vocabulary"): ConceptualModelControlledVocabularyAssignment {
  return {
    id: `${qualifier}-${pattern}`,
    qualifier,
    vocabulary: { id: vocabularyId, iri: null, title: {}, pattern, references: "", conformsToSkos: true },
  };
}

interface Options {
  /** Assignments of the class the property refers to. */
  assignments?: ConceptualModelControlledVocabularyAssignment[];
  /** The class the property refers to has an attribute, so it is an object. */
  asObject?: boolean;
  regex?: string;
  cardinalityMax?: number | null;
  require?: boolean;
  restrict?: boolean;
  identity?: "ALWAYS" | "OPTIONAL" | "NEVER";
  /** Add another primitive type to the property. */
  withPrimitiveType?: boolean;
}

function valueClassOf(options: Options): StructureModelClass {
  const result = new StructureModelClass();
  result.pimIri = "value";
  result.cimIri = "http://example.com/value";
  result.instancesHaveIdentity = options.identity ?? "ALWAYS";
  result.instancesSpecifyTypes = "NEVER";
  result.controlledVocabularies = options.assignments ?? [];
  result.requireRecommendedControlledVocabularyValue = options.require ?? false;
  result.restrictToRecommendedControlledVocabulary = options.restrict ?? false;
  result.regex = options.regex ?? null;
  if (options.asObject) {
    const attribute = new StructureModelProperty();
    attribute.technicalLabel = "name";
    attribute.cardinalityMax = 1;
    attribute.dataTypes = [Object.assign(new StructureModelPrimitiveType(), { dataType: "http://www.w3.org/2001/XMLSchema#string" })];
    result.properties.push(attribute);
  }
  return result;
}

/**
 * Generates the schema of a structure whose root class has the property "values"
 * that refers to a class with the given options.
 * The identity properties are added the same way as the generator adds them.
 */
function generateSchema(options: Options): JsonSchema {
  const type = new StructureModelComplexType();
  type.dataType = valueClassOf(options);
  const property = new StructureModelProperty();
  property.technicalLabel = "values";
  property.cardinalityMin = 0;
  property.cardinalityMax = options.cardinalityMax === undefined ? null : options.cardinalityMax;
  property.dataTypes = [type];
  if (options.withPrimitiveType) {
    property.dataTypes.push(Object.assign(new StructureModelPrimitiveType(), { dataType: "http://www.w3.org/2001/XMLSchema#string" }));
  }

  const root = new StructureModelClass();
  root.pimIri = "root";
  root.instancesHaveIdentity = "NEVER";
  root.instancesSpecifyTypes = "NEVER";
  root.properties.push(property);
  const schemaRoot = new StructureModelSchemaRoot();
  schemaRoot.classes.push(root);
  const structure = new StructureModel();
  structure.roots.push(schemaRoot);

  const specification = new DataSpecification();
  const withIdentity = structureModelAddIdAndTypeProperties(structure, DefaultJsonConfiguration, {});
  return structureModelToJsonSchema(
    { specification },
    specification,
    withIdentity,
    DefaultJsonConfiguration,
    {} as DataSpecificationArtefact,
  );
}

async function generate(options: Options): Promise<Json> {
  const stream = new MemoryOutputStream();
  await writeJsonSchema(generateSchema(options), stream);
  return JSON.parse(stream.getContent()).properties.values;
}

/**
 * The schema of the property "values" as the model that documentation is created from.
 */
function generateValuesModel(options: Options): JsonSchemaArray {
  return (generateSchema(options).root as JsonSchemaObject).properties.values as JsonSchemaArray;
}

const A = "^http://example\\.com/a/[a-z]+$";
const B = "^http://example\\.com/b/[a-z]+$";

describe("JSON schema of values with controlled vocabularies", () => {

  describe("the value is an IRI", () => {

    it("Matches the pattern of a 'must' vocabulary for every value.", async () => {
      expect(await generate({ assignments: [assignment("must", A)] })).toStrictEqual({
        type: "array",
        items: { type: "string", format: "iri", pattern: A },
      });
    });

    it("Requires all patterns of several 'must' vocabularies with allOf.", async () => {
      const values = await generate({ assignments: [assignment("must", A), assignment("must", B)] });
      expect(values.items).toStrictEqual({
        type: "string",
        format: "iri",
        allOf: [{ type: "string", pattern: A }, { type: "string", pattern: B }],
      });
    });

    it("Requires both the regex of the class and the pattern of the vocabulary.", async () => {
      const values = await generate({ regex: "^http://example\\.com/", assignments: [assignment("must", A)] });
      expect(values.items.allOf).toStrictEqual([
        { type: "string", pattern: "^http://example\\.com/" },
        { type: "string", pattern: A },
      ]);
      expect(values.items.pattern).toBeUndefined();
    });

    it("Keeps the regex of the class as the pattern when there is no vocabulary.", async () => {
      expect(await generate({ regex: "^x$" })).toStrictEqual({
        type: "array",
        items: { type: "string", format: "iri", pattern: "^x$" },
      });
    });

    it("Does not constrain values for a vocabulary without a pattern.", async () => {
      expect(await generate({ assignments: [assignment("must", null)] })).toStrictEqual({
        type: "array",
        items: { type: "string", format: "iri" },
      });
    });

  });

  describe("'at-least-one'", () => {

    it("Requires an array to contain a value that matches the pattern.", async () => {
      expect(await generate({ assignments: [assignment("at-least-one", A)] })).toStrictEqual({
        type: "array",
        contains: { type: "string", pattern: A },
        items: { type: "string", format: "iri" },
      });
    });

    it("Requires a contained value for each of several vocabularies.", async () => {
      const values = await generate({ assignments: [assignment("at-least-one", A), assignment("at-least-one", B)] });
      expect(values.contains).toBeUndefined();
      expect(values.allOf).toStrictEqual([
        { type: "array", contains: { type: "string", pattern: A }, items: {} },
        { type: "array", contains: { type: "string", pattern: B }, items: {} },
      ]);
    });

    it("Requires the only value to match when the property has at most one value.", async () => {
      expect(await generate({ cardinalityMax: 1, assignments: [assignment("at-least-one", A)] })).toStrictEqual({
        allOf: [
          { type: "string", format: "iri" },
          { type: "string", pattern: A },
        ],
      });
    });

    it("Constrains no value that is not required to match.", async () => {
      const values = await generate({ assignments: [assignment("at-least-one", A)] });
      expect(values.items.pattern).toBeUndefined();
    });

    it("Does not constrain a property that also has another type.", async () => {
      const values = await generate({ withPrimitiveType: true, assignments: [assignment("at-least-one", A)] });
      expect(values.contains).toBeUndefined();
    });

  });

  describe("'recommended'", () => {

    it("Does not constrain anything by default.", async () => {
      expect(await generate({ assignments: [assignment("recommended", A)] })).toStrictEqual({
        type: "array",
        items: { type: "string", format: "iri" },
      });
    });

    it("Requires a contained value when a value is required.", async () => {
      const values = await generate({ require: true, assignments: [assignment("recommended", A)] });
      expect(values.contains).toStrictEqual({ type: "string", pattern: A });
      expect(values.items.pattern).toBeUndefined();
    });

    it("Matches every value when values are restricted.", async () => {
      const values = await generate({ restrict: true, assignments: [assignment("recommended", A)] });
      expect(values.items.pattern).toBe(A);
      expect(values.contains).toBeUndefined();
    });

  });

  it("Does not constrain anything for 'may'.", async () => {
    expect(await generate({ require: true, restrict: true, assignments: [assignment("may", A)] })).toStrictEqual({
      type: "array",
      items: { type: "string", format: "iri" },
    });
  });

  describe("the value is an object", () => {

    it("Matches the pattern with the id of every object.", async () => {
      const values = await generate({ asObject: true, assignments: [assignment("must", A)] });
      expect(values.items.properties.id).toStrictEqual({ type: "string", format: "iri", pattern: A });
    });

    it("Requires an array to contain an object whose id matches the pattern.", async () => {
      const values = await generate({ asObject: true, assignments: [assignment("at-least-one", A)] });
      expect(values.contains).toStrictEqual({
        type: "object",
        required: ["id"],
        properties: { id: { type: "string", pattern: A } },
      });
      expect(values.items.properties.id).toStrictEqual({ type: "string", format: "iri" });
    });

    it("Matches every object id and requires a contained object when both options of 'recommended' are on.", async () => {
      const values = await generate({ asObject: true, require: true, restrict: true, assignments: [assignment("recommended", A)] });
      expect(values.items.properties.id.pattern).toBe(A);
      expect(values.contains.properties.id.pattern).toBe(A);
    });

    it("Does not require every object id to match when only one value is required.", async () => {
      const values = await generate({ asObject: true, require: true, assignments: [assignment("recommended", A)] });
      expect(values.items.properties.id).toStrictEqual({ type: "string", format: "iri" });
      expect(values.contains.properties.id.pattern).toBe(A);
    });

    it("Cannot constrain objects that have no id.", async () => {
      const values = await generate({ asObject: true, identity: "NEVER", assignments: [assignment("must", A), assignment("at-least-one", B)] });
      expect(values.contains).toBeUndefined();
      expect(values.items.properties.id).toBeUndefined();
    });

  });

});

describe("Source of the patterns in the schema model", () => {

  it("Names the vocabulary of a pattern that every value must match.", () => {
    const items = generateValuesModel({ assignments: [assignment("must", A, "vocabulary-a")] }).items as JsonSchemaString;
    expect(items.pattern).toBe(A);
    expect(items.controlledVocabularyId).toBe("vocabulary-a");
  });

  it("Names the vocabulary of each of several patterns and none for the regex of the class.", () => {
    const items = generateValuesModel({
      regex: "^http://example\\.com/",
      assignments: [assignment("must", A, "vocabulary-a"), assignment("must", B, "vocabulary-b")],
    }).items as JsonSchemaString;
    expect((items.allOf as JsonSchemaString[]).map(rule => rule.controlledVocabularyId)).toStrictEqual([null, "vocabulary-a", "vocabulary-b"]);
  });

  it("Names no vocabulary for the regex of the class alone.", () => {
    const items = generateValuesModel({ regex: "^x$" }).items as JsonSchemaString;
    expect(items.pattern).toBe("^x$");
    expect(items.controlledVocabularyId).toBeNull();
  });

  it("Names the vocabulary of a pattern that one value must match.", () => {
    const contains = generateValuesModel({ assignments: [assignment("at-least-one", A, "vocabulary-a")] }).contains as JsonSchemaString;
    expect(contains.controlledVocabularyId).toBe("vocabulary-a");
  });

  it("Names the vocabulary of the pattern of the id of a contained object.", () => {
    const contains = generateValuesModel({ asObject: true, assignments: [assignment("at-least-one", A, "vocabulary-a")] }).contains as JsonSchemaObject;
    expect((contains.properties.id as JsonSchemaString).controlledVocabularyId).toBe("vocabulary-a");
  });

  it("Names the vocabulary in each rule of an array that must contain several values.", () => {
    const rules = generateValuesModel({
      assignments: [assignment("at-least-one", A, "vocabulary-a"), assignment("at-least-one", B, "vocabulary-b")],
    }).allOf as JsonSchemaArray[];
    expect(rules.map(rule => (rule.contains as JsonSchemaString).controlledVocabularyId)).toStrictEqual(["vocabulary-a", "vocabulary-b"]);
  });

  it("Does not write the vocabulary to the schema.", async () => {
    const values = await generate({ assignments: [assignment("must", A, "vocabulary-a")] });
    expect(JSON.stringify(values)).not.toContain("vocabulary-a");
  });

});
