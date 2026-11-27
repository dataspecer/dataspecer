import { afterEach, describe, expect, it, vi } from "vitest";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { DataSpecificationSchema } from "@dataspecer/core/data-specification/model";
import type { ArtefactGeneratorContext } from "@dataspecer/generators/generator/artefact-generator-context";
import type { ConceptualModelControlledVocabularyAssignment } from "@dataspecer/generators/conceptual-model/model";
import { StructureModel, StructureModelClass, StructureModelComplexType, StructureModelProperty, StructureModelSchemaRoot } from "@dataspecer/generators/structure-model/model";
import { structureModelTransformPrimitiveTypes } from "@dataspecer/generators/structure-model/transformation";
import { structureModelToXmlSchema } from "./xml-schema-model-adapter.ts";
import {
  xmlSchemaComplexTypeDefinitionIsSequence,
  xmlSchemaSimpleTypeDefinitionIsRestriction,
  xmlSchemaTypeIsComplex,
  type XmlSchema,
  type XmlSchemaComplexContentElement,
  type XmlSchemaComplexType,
  type XmlSchemaSimpleType,
} from "./xml-schema-model.ts";

const PATTERN_A = "^http://example\\.com/cv-a/[a-z]+$";
const PATTERN_B = "^http://example\\.com/cv-b/[0-9]+$";

function assignment(qualifier: "must" | "at-least-one" | "recommended" | "may", pattern: string, id: string): ConceptualModelControlledVocabularyAssignment {
  return {
    id: `assignment-${id}`,
    qualifier,
    vocabulary: { id, iri: null, title: {}, pattern, references: "", conformsToSkos: false },
  };
}

/**
 * Generates the schema of a structure with a root class that has no properties but
 * the IRI, so everything in the schema comes from the rules on the IRI.
 */
async function generate(
  configure: (structureClass: StructureModelClass) => void,
  transform: (model: StructureModel) => StructureModel = (model) => model,
): Promise<XmlSchema> {
  const structureClass = new StructureModelClass();
  structureClass.psmIri = "class";
  structureClass.technicalLabel = "dataset";
  structureClass.iris = ["http://example.com/Dataset"];
  structureClass.isClosed = true;
  configure(structureClass);

  const root = new StructureModelSchemaRoot();
  root.psmIri = "root";
  root.technicalLabel = "dataset";
  root.classes = [structureClass];

  const model = new StructureModel();
  model.psmIri = "schema";
  model.roots = [root];

  const schema = new DataPsmSchema("schema");
  const context = {
    // The adapter reads the PSM schema of the structure for the namespace of the XML.
    reader: { readResource: (iri: string) => (iri === "schema" ? schema : null) },
    structureModels: {},
    specifications: {},
  } as unknown as ArtefactGeneratorContext;

  const artifact = new DataSpecificationSchema();
  artifact.psm = "schema";
  artifact.publicUrl = "https://example.com/schema.xsd";

  const [result] = await structureModelToXmlSchema(context, artifact, transform(model));
  return result!;
}

/**
 * The <iri> element of the root class of the generated schema.
 */
function iriElementOf(schema: XmlSchema): XmlSchemaComplexContentElement | undefined {
  // The element of the root refers to the complex type of the class, which is defined next to it.
  const rootType = schema.types.find((type) => type.name?.[1] === "dataset");
  const definition = xmlSchemaTypeIsComplex(rootType ?? null) ? (rootType as XmlSchemaComplexType).complexDefinition : null;
  if (definition === null || !xmlSchemaComplexTypeDefinitionIsSequence(definition)) {
    return undefined;
  }
  return (definition.contents as XmlSchemaComplexContentElement[]).find((item) => item.element?.name[1] === "iri");
}

/**
 * Simple types defined in the schema. The complex type of the root class is left out.
 */
function simpleTypesOf(schema: XmlSchema) {
  return schema.types.filter((type) => "simpleDefinition" in type);
}

/**
 * Simple types of the schema as [name, base, pattern, controlled vocabulary].
 */
function typeSummary(schema: XmlSchema) {
  return simpleTypesOf(schema).map((type) => {
    const definition = (type as XmlSchemaSimpleType).simpleDefinition;
    if (!xmlSchemaSimpleTypeDefinitionIsRestriction(definition)) {
      throw new Error("Expected a simple type restriction.");
    }
    return [type.name, definition.base, definition.pattern, definition.controlledVocabularyId];
  });
}

/**
 * Property of the root class whose value is an object of a class with the given controlled vocabularies.
 */
function propertyWithValueOf(label: string, assignments: ConceptualModelControlledVocabularyAssignment[], configure: (valueClass: StructureModelClass) => void = () => {}): StructureModelProperty {
  const valueClass = new StructureModelClass();
  valueClass.psmIri = `class-${label}`;
  valueClass.technicalLabel = label;
  valueClass.iris = [`http://example.com/${label}`];
  valueClass.isClosed = true;
  valueClass.controlledVocabularies = assignments;
  configure(valueClass);

  const property = new StructureModelProperty();
  property.psmIri = `property-${label}`;
  property.technicalLabel = label;
  property.cardinalityMin = 0;
  property.cardinalityMax = null;
  property.dataTypes = [Object.assign(new StructureModelComplexType(), { dataType: valueClass })];
  return property;
}

/**
 * Assertions on the complex type of the root class.
 */
function assertionsOf(schema: XmlSchema) {
  return (schema.types.find((type) => type.name?.[1] === "dataset") as XmlSchemaComplexType).assertions;
}

describe("type of the IRI in the generated schema", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is xs:anyURI and defines no type for a class without rules", async () => {
    const schema = await generate(() => {});

    expect(iriElementOf(schema)?.element.type?.name).toStrictEqual(["xs", "anyURI"]);
    expect(simpleTypesOf(schema)).toStrictEqual([]);
  });

  it("is a named type with the pattern of the class regex converted to XML Schema", async () => {
    const schema = await generate((structureClass) => {
      structureClass.regex = "^http://example\\.com/.*$";
    });

    expect(typeSummary(schema)).toStrictEqual([
      [[null, "dataset-iri"], ["xs", "anyURI"], "http://example\\.com/.*", null],
    ]);
    expect(iriElementOf(schema)?.element.type?.name).toStrictEqual([null, "dataset-iri"]);
  });

  it("chains the class regex and the controlled vocabulary patterns so that all of them apply", async () => {
    const schema = await generate((structureClass) => {
      structureClass.regex = "^http://example\\.com/.*$";
      structureClass.controlledVocabularies = [assignment("must", PATTERN_A, "vocabulary-a")];
    });

    expect(typeSummary(schema)).toStrictEqual([
      [[null, "dataset-iri-1"], ["xs", "anyURI"], "http://example\\.com/.*", null],
      [[null, "dataset-iri"], [null, "dataset-iri-1"], "http://example\\.com/cv-a/[a-z]+", "vocabulary-a"],
    ]);
    expect(iriElementOf(schema)?.element.type?.name).toStrictEqual([null, "dataset-iri"]);
  });

  it("follows the options of the class for a recommended vocabulary", async () => {
    const restricted = await generate((structureClass) => {
      structureClass.controlledVocabularies = [assignment("recommended", PATTERN_A, "vocabulary-a")];
      structureClass.restrictToRecommendedControlledVocabulary = true;
    });
    const notRestricted = await generate((structureClass) => {
      structureClass.controlledVocabularies = [assignment("recommended", PATTERN_A, "vocabulary-a")];
    });

    expect(simpleTypesOf(restricted)).toHaveLength(1);
    expect(simpleTypesOf(notRestricted)).toHaveLength(0);
  });

  it("does not constrain the IRI by the rule that needs at least one value", async () => {
    const schema = await generate((structureClass) => {
      structureClass.controlledVocabularies = [assignment("at-least-one", PATTERN_B, "vocabulary-b")];
    });

    expect(simpleTypesOf(schema)).toStrictEqual([]);
    expect(iriElementOf(schema)?.element.type?.name).toStrictEqual(["xs", "anyURI"]);
  });

  it("leaves out a pattern that XML Schema cannot express and warns about it", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const schema = await generate((structureClass) => {
      structureClass.controlledVocabularies = [assignment("must", "^(?=a)b$", "vocabulary-a"), assignment("must", PATTERN_B, "vocabulary-b")];
    });

    expect(typeSummary(schema)).toStrictEqual([
      [[null, "dataset-iri"], ["xs", "anyURI"], "http://example\\.com/cv-b/[0-9]+", "vocabulary-b"],
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("vocabulary-a");
  });

  it("has no IRI and no type when the instances of the class have no identity", async () => {
    const schema = await generate((structureClass) => {
      structureClass.instancesHaveIdentity = "NEVER";
      structureClass.controlledVocabularies = [assignment("must", PATTERN_A, "vocabulary-a")];
    });

    expect(iriElementOf(schema)).toBeUndefined();
    expect(simpleTypesOf(schema)).toStrictEqual([]);
  });
});

describe("assertions on the type of the class in the generated schema", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requires a value of a controlled vocabulary among the values of a property of the class", async () => {
    const schema = await generate((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [assignment("at-least-one", PATTERN_A, "vocabulary-a")])];
    });

    expect(assertionsOf(schema)).toStrictEqual([{
      test: "not(*:distribution) or *:distribution/*:iri[matches(., '^(http://example\\.com/cv-a/[a-z]+)$')]",
      controlledVocabularyId: "vocabulary-a",
      elementName: "distribution",
    }]);
  });

  it("leaves the IRI of the value as it is, as the rule is about all the values together", async () => {
    const schema = await generate((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [assignment("at-least-one", PATTERN_A, "vocabulary-a")])];
    });

    expect(simpleTypesOf(schema)).toStrictEqual([]);
  });

  it("restricts every value by the type of the IRI and requires one by the assertion for rules of both kinds", async () => {
    const schema = await generate((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [
        assignment("must", PATTERN_A, "vocabulary-a"),
        assignment("at-least-one", PATTERN_B, "vocabulary-b"),
      ])];
    });

    expect(typeSummary(schema)).toStrictEqual([
      [[null, "distribution-iri"], ["xs", "anyURI"], "http://example\\.com/cv-a/[a-z]+", "vocabulary-a"],
    ]);
    expect(assertionsOf(schema)!.map((assertion) => assertion.controlledVocabularyId)).toStrictEqual(["vocabulary-b"]);
  });

  it("has no assertions for a class without such rules", async () => {
    const schema = await generate((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [assignment("must", PATTERN_A, "vocabulary-a")])];
    });

    expect(assertionsOf(schema)).toStrictEqual([]);
  });

  it("warns about a rule that cannot be written and writes the others", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const schema = await generate((structureClass) => {
      structureClass.properties = [
        propertyWithValueOf("withoutIri", [assignment("at-least-one", PATTERN_A, "vocabulary-a")], (valueClass) => { valueClass.instancesHaveIdentity = "NEVER"; }),
        propertyWithValueOf("distribution", [assignment("at-least-one", PATTERN_B, "vocabulary-b")]),
      ];
    });

    expect(assertionsOf(schema)!.map((assertion) => assertion.controlledVocabularyId)).toStrictEqual(["vocabulary-b"]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain("property withoutIri of class dataset has a class without an IRI");
  });
});

/**
 * The property element of the root class in the generated schema.
 */
function propertyElementOf(schema: XmlSchema, label: string): XmlSchemaComplexContentElement | undefined {
  const rootType = schema.types.find((type) => type.name?.[1] === "dataset") as XmlSchemaComplexType;
  const definition = rootType.complexDefinition;
  return xmlSchemaComplexTypeDefinitionIsSequence(definition)
    ? (definition.contents as XmlSchemaComplexContentElement[]).find((item) => item.element?.name[1] === label)
    : undefined;
}

/**
 * The XML generator turns a property whose value is a class without properties into a property with the
 * IRI as its simple value, before the adapter gets the structure. The rules of the class must still apply.
 */
describe("values that are classes without properties, as the generator transforms them", () => {
  const generateLikeGenerator = (configure: (structureClass: StructureModelClass) => void) => generate(configure, structureModelTransformPrimitiveTypes);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("has the IRI as the content of the element of the property", async () => {
    const schema = await generateLikeGenerator((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [])];
    });

    expect(propertyElementOf(schema, "distribution")?.element.type?.name).toStrictEqual(["xs", "anyURI"]);
    expect(simpleTypesOf(schema)).toStrictEqual([]);
  });

  it("restricts the content by the pattern of the controlled vocabulary", async () => {
    const schema = await generateLikeGenerator((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [assignment("must", PATTERN_A, "vocabulary-a")])];
    });

    const summary = typeSummary(schema);
    expect(summary).toHaveLength(1);
    expect(summary[0]!.slice(1)).toStrictEqual([["xs", "anyURI"], "http://example\\.com/cv-a/[a-z]+", "vocabulary-a"]);
    expect(propertyElementOf(schema, "distribution")?.element.type?.name).toStrictEqual(summary[0]![0]);
  });

  it("restricts the content by the regex of the class", async () => {
    const schema = await generateLikeGenerator((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [], (valueClass) => { valueClass.regex = "^http://example\\.com/cv-a/r.*$"; })];
    });

    const summary = typeSummary(schema);
    expect(summary).toHaveLength(1);
    expect(summary[0]!.slice(1)).toStrictEqual([["xs", "anyURI"], "http://example\\.com/cv-a/r.*", null]);
    expect(propertyElementOf(schema, "distribution")?.element.type?.name).toStrictEqual(summary[0]![0]);
  });

  it("restricts the type of the class regex by the controlled vocabulary pattern so that both apply", async () => {
    const schema = await generateLikeGenerator((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [assignment("must", PATTERN_A, "vocabulary-a")], (valueClass) => {
        valueClass.regex = "^http://example\\.com/cv-a/r.*$";
      })];
    });

    const summary = typeSummary(schema);
    expect(summary.map((type) => type[3])).toStrictEqual([null, "vocabulary-a"]);
    expect(summary[1]![1]).toStrictEqual(summary[0]![0]);
  });

  it("follows the option of the class for a recommended vocabulary", async () => {
    const schema = await generateLikeGenerator((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [assignment("recommended", PATTERN_A, "vocabulary-a")], (valueClass) => {
        valueClass.restrictToRecommendedControlledVocabulary = true;
      })];
    });

    expect(typeSummary(schema)).toHaveLength(1);
  });

  it("requires a value among the values of the property by an assertion on the content", async () => {
    const schema = await generateLikeGenerator((structureClass) => {
      structureClass.properties = [propertyWithValueOf("distribution", [assignment("at-least-one", PATTERN_A, "vocabulary-a")])];
    });

    expect(assertionsOf(schema)).toStrictEqual([{
      test: "not(*:distribution) or *:distribution[matches(., '^(http://example\\.com/cv-a/[a-z]+)$')]",
      controlledVocabularyId: "vocabulary-a",
      elementName: "distribution",
    }]);
    expect(simpleTypesOf(schema)).toStrictEqual([]);
  });
});
