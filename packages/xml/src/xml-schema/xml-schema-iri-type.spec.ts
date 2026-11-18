import { describe, expect, it } from "vitest";
import { xmlSchemaSimpleTypeDefinitionIsRestriction, xmlSchemaTypeIsSimple } from "./xml-schema-model.ts";
import { createIriType, type IriTypeParameters } from "./xml-schema-iri-type.ts";
import type { XmlSchemaPatternRule } from "./xml-schema-rules.ts";

const PARAMETERS: IriTypeParameters = { classLabel: "dataset", xsdPrefix: "xs", schemaPrefix: "ds" };

function rule(pattern: string, vocabularyId: string | null = null): XmlSchemaPatternRule {
  return { pattern, sourcePattern: `^${pattern}$`, vocabularyId };
}

/**
 * Restriction of each defined type as [name, base, pattern, vocabulary].
 */
function chainOf(rules: XmlSchemaPatternRule[]) {
  return Object.entries(createIriType(rules, PARAMETERS).definitions).map(([name, definition]) => {
    const restriction = definition.simpleDefinition;
    if (!xmlSchemaSimpleTypeDefinitionIsRestriction(restriction)) {
      throw new Error("Expected a restriction.");
    }
    return [name, restriction.base, restriction.pattern, restriction.controlledVocabularyId];
  });
}

describe("type of the IRI of a class", () => {
  it("is xs:anyURI and defines no type when there are no rules", () => {
    const { definitions, type } = createIriType([], PARAMETERS);

    expect(definitions).toStrictEqual({});
    expect(type.name).toStrictEqual(["xs", "anyURI"]);
    expect(xmlSchemaTypeIsSimple(type)).toBe(false);
  });

  it("is a named type restricting xs:anyURI for one rule", () => {
    const rules = [rule("http://example\\.com/.*")];
    const { type } = createIriType(rules, PARAMETERS);

    expect(chainOf(rules)).toStrictEqual([
      ["dataset-iri", ["xs", "anyURI"], "http://example\\.com/.*", null],
    ]);
    expect(type.name).toStrictEqual(["ds", "dataset-iri"]);
  });

  it("derives each type from the one of the previous rule, so a value has to match all of them", () => {
    const rules = [rule("class-regex"), rule("cv-a", "vocabulary-a"), rule("cv-b", "vocabulary-b")];

    expect(chainOf(rules)).toStrictEqual([
      ["dataset-iri-1", ["xs", "anyURI"], "class-regex", null],
      ["dataset-iri-2", ["ds", "dataset-iri-1"], "cv-a", "vocabulary-a"],
      ["dataset-iri", ["ds", "dataset-iri-2"], "cv-b", "vocabulary-b"],
    ]);
    expect(createIriType(rules, PARAMETERS).type.name).toStrictEqual(["ds", "dataset-iri"]);
  });

  it("keeps the controlled vocabulary of the rule on its type", () => {
    const [[, , , vocabularyId]] = chainOf([rule("cv-a", "vocabulary-a")]);

    expect(vocabularyId).toBe("vocabulary-a");
  });

  it("references the types without a prefix when the schema has none", () => {
    const parameters = { ...PARAMETERS, schemaPrefix: null, xsdPrefix: null };
    const { type, definitions } = createIriType([rule("a"), rule("b")], parameters);

    expect(type.name).toStrictEqual([null, "dataset-iri"]);
    expect(Object.values(definitions).map((definition) => xmlSchemaSimpleTypeDefinitionIsRestriction(definition.simpleDefinition) && definition.simpleDefinition.base))
      .toStrictEqual([[null, "anyURI"], [null, "dataset-iri-1"]]);
  });

  it("names the types after the class and keys the definitions by their names", () => {
    const { definitions } = createIriType([rule("a"), rule("b")], { ...PARAMETERS, classLabel: "distribution" });

    expect(Object.keys(definitions)).toStrictEqual(["distribution-iri-1", "distribution-iri"]);
    expect(Object.values(definitions).map((definition) => definition.name)).toStrictEqual([[null, "distribution-iri-1"], [null, "distribution-iri"]]);
  });
});
