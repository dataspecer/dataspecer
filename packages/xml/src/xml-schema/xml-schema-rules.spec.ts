import { describe, expect, it } from "vitest";
import { StructureModelClass } from "@dataspecer/generators/structure-model/model";
import type { ConceptualModelControlledVocabularyAssignment } from "@dataspecer/generators/conceptual-model/model";
import { convertPatternToXsd, getXmlSchemaRules } from "./xml-schema-rules.ts";

function converted(pattern: string): string {
  const conversion = convertPatternToXsd(pattern);
  if ("unsupportedReason" in conversion) {
    throw new Error(`Not converted: ${conversion.unsupportedReason}`);
  }
  return conversion.pattern;
}

function unsupportedReason(pattern: string): string | null {
  const conversion = convertPatternToXsd(pattern);
  return "unsupportedReason" in conversion ? conversion.unsupportedReason : null;
}

describe("conversion of a pattern to XML Schema", () => {
  it("removes the anchors of a pattern that has both", () => {
    expect(converted("^http://example\\.com/cv-a/[a-z]+$")).toBe("http://example\\.com/cv-a/[a-z]+");
  });

  it("matches anywhere in the value on a side that is not anchored", () => {
    expect(converted("cv-a/")).toBe(".*cv-a/.*");
    expect(converted("^http://example")).toBe("http://example.*");
    expect(converted("/cv-a$")).toBe(".*/cv-a");
  });

  it("anchors every alternative of the top level on its own", () => {
    expect(converted("^a|b$")).toBe("a.*|.*b");
    expect(converted("^(a|b)$")).toBe("(a|b)");
  });

  it("writes digits and word characters as classes, as the XML Schema ones match more characters", () => {
    expect(converted("^\\d+\\w$")).toBe("[0-9]+[A-Za-z0-9_]");
    expect(converted("^[\\d\\w-]+$")).toBe("[0-9A-Za-z0-9_-]+");
    expect(converted("^\\D\\W$")).toBe("[^0-9][^A-Za-z0-9_]");
  });

  it("escapes a hyphen next to a set of characters in a class, where it is a literal hyphen and not a range", () => {
    expect(converted("^[\\w-.]+$")).toBe("[A-Za-z0-9_\\-.]+");
    expect(converted("^[\\d-x]+$")).toBe("[0-9\\-x]+");
    expect(converted("^[a-\\d]+$")).toBe("[a\\-0-9]+");
    expect(converted("^[\\s-x]+$")).toBe("[\\s\\-x]+");
    expect(converted("^[\\p{L}-x]+$")).toBe("[\\p{L}\\-x]+");
  });

  it("keeps a hyphen at the edge of a class and a range between letters", () => {
    expect(converted("^[\\w-]+$")).toBe("[A-Za-z0-9_-]+");
    expect(converted("^[-\\w]+$")).toBe("[-A-Za-z0-9_]+");
    expect(converted("^[^-\\d]+$")).toBe("[^-0-9]+");
    expect(converted("^[\\w.a-z]+$")).toBe("[A-Za-z0-9_.a-z]+");
  });

  it("keeps the escapes that XML Schema has", () => {
    expect(converted("^a\\.b\\-c\\(d\\)\\|\\\\$")).toBe("a\\.b\\-c\\(d\\)\\|\\\\");
    expect(converted("^\\p{L}\\n$")).toBe("\\p{L}\\n");
  });

  it("drops the backslash before a character that is not escaped in XML Schema", () => {
    expect(converted("^http:\\/\\/example$")).toBe("http://example");
  });

  it("turns a non-capturing group into a group", () => {
    expect(converted("^(?:a|b)c$")).toBe("(a|b)c");
  });

  it("keeps quantifiers and negated character classes", () => {
    expect(converted("^[^/]{2,3}x*y+z?$")).toBe("[^/]{2,3}x*y+z?");
  });

  it("escapes braces that are not a quantifier", () => {
    expect(converted("^a{b}$")).toBe("a\\{b\\}");
  });

  it("reports what XML Schema cannot express", () => {
    expect(unsupportedReason("^(?=a)b$")).toContain("(?");
    expect(unsupportedReason("^(?<!a)b$")).toContain("(?");
    expect(unsupportedReason("^a+?$")).toContain("lazy");
    expect(unsupportedReason("^a{1,2}?$")).toContain("lazy");
    expect(unsupportedReason("^a??$")).toContain("lazy");
    expect(unsupportedReason("^(a)\\1$")).toContain("back reference");
    expect(unsupportedReason("^\\bfoo$")).toContain("\\b");
    expect(unsupportedReason("^\\u0041$")).toContain("\\u");
    expect(unsupportedReason("^[\\D]$")).toContain("character class");
    expect(unsupportedReason("^[]$")).toContain("empty");
  });

  it("reports anchors that are not at the edge of an alternative", () => {
    expect(unsupportedReason("a^b")).toContain("^");
    expect(unsupportedReason("a$b")).toContain("$");
    expect(unsupportedReason("(^a)")).toContain("^");
    expect(unsupportedReason("(a$)")).toContain("$");
  });

  it("reports patterns that are not well formed", () => {
    expect(unsupportedReason("^(a$")).not.toBeNull();
    expect(unsupportedReason("^a)$")).not.toBeNull();
    expect(unsupportedReason("^[a$")).not.toBeNull();
    expect(unsupportedReason("^a\\")).not.toBeNull();
  });
});

const PATTERN_A = "^http://example\\.com/cv-a/[a-z]+$";
const PATTERN_B = "^http://example\\.com/cv-b/[0-9]+$";

function assignment(qualifier: "must" | "at-least-one" | "recommended" | "may", pattern: string | null, id: string): ConceptualModelControlledVocabularyAssignment {
  return {
    id: `assignment-${id}`,
    qualifier,
    vocabulary: { id, iri: null, title: {}, pattern, references: "", conformsToSkos: false },
  };
}

function structureClass(
  assignments: ConceptualModelControlledVocabularyAssignment[],
  options: { regex?: string; require?: boolean; restrict?: boolean } = {},
): StructureModelClass {
  const result = new StructureModelClass();
  result.regex = options.regex ?? null;
  result.controlledVocabularies = assignments;
  result.requireRecommendedControlledVocabularyValue = options.require ?? null;
  result.restrictToRecommendedControlledVocabulary = options.restrict ?? null;
  return result;
}

describe("rules of the class for XML Schema", () => {
  it("has no rules for a class without a regex and without controlled vocabularies", () => {
    expect(getXmlSchemaRules(structureClass([]))).toStrictEqual({ everyValue: [], atLeastOne: [], skipped: [] });
  });

  it("puts the regex of the class before the rules of the controlled vocabularies", () => {
    const rules = getXmlSchemaRules(structureClass([assignment("must", PATTERN_A, "a")], { regex: "^http://example\\.com/.*$" }));

    expect(rules.everyValue.map((rule) => [rule.pattern, rule.vocabularyId])).toStrictEqual([
      ["http://example\\.com/.*", null],
      ["http://example\\.com/cv-a/[a-z]+", "a"],
    ]);
  });

  it("keeps the pattern as it was entered next to the converted one", () => {
    const [rule] = getXmlSchemaRules(structureClass([assignment("must", PATTERN_A, "a")])).everyValue;

    expect(rule!.sourcePattern).toBe(PATTERN_A);
    expect(rule!.pattern).toBe("http://example\\.com/cv-a/[a-z]+");
  });

  it("sorts the rules by the qualifier of the assignment", () => {
    const rules = getXmlSchemaRules(structureClass([
      assignment("must", PATTERN_A, "a"),
      assignment("at-least-one", PATTERN_B, "b"),
      assignment("may", "^http://example\\.com/cv-c/.*$", "c"),
    ]));

    expect(rules.everyValue.map((rule) => rule.vocabularyId)).toStrictEqual(["a"]);
    expect(rules.atLeastOne.map((rule) => rule.vocabularyId)).toStrictEqual(["b"]);
  });

  it("follows the options of the class for the recommended vocabularies", () => {
    const assignments = [assignment("recommended", PATTERN_A, "a")];

    expect(getXmlSchemaRules(structureClass(assignments))).toMatchObject({ everyValue: [], atLeastOne: [] });
    expect(getXmlSchemaRules(structureClass(assignments, { restrict: true }))).toMatchObject({
      everyValue: [{ vocabularyId: "a" }],
      atLeastOne: [],
    });
    expect(getXmlSchemaRules(structureClass(assignments, { require: true }))).toMatchObject({
      everyValue: [],
      atLeastOne: [{ vocabularyId: "a" }],
    });
  });

  it("lists a pattern once when the regex of the class equals the pattern of a vocabulary", () => {
    const rules = getXmlSchemaRules(structureClass([assignment("must", PATTERN_A, "a")], { regex: PATTERN_A }));

    expect(rules.everyValue).toHaveLength(1);
    expect(rules.everyValue[0]!.vocabularyId).toBeNull();
  });

  it("skips a rule that cannot be converted and says why, the others stay", () => {
    const rules = getXmlSchemaRules(structureClass([
      assignment("must", "^(?=a)b$", "lookahead"),
      assignment("must", PATTERN_A, "a"),
      assignment("at-least-one", "^a+?$", "lazy"),
    ]));

    expect(rules.everyValue.map((rule) => rule.vocabularyId)).toStrictEqual(["a"]);
    expect(rules.atLeastOne).toStrictEqual([]);
    expect(rules.skipped.map((rule) => [rule.vocabularyId, rule.sourcePattern])).toStrictEqual([
      ["lookahead", "^(?=a)b$"],
      ["lazy", "^a+?$"],
    ]);
    expect(rules.skipped[0]!.reason).not.toBe("");
  });

  it("skips a class regex that cannot be converted", () => {
    const rules = getXmlSchemaRules(structureClass([], { regex: "^\\bfoo$" }));

    expect(rules.everyValue).toStrictEqual([]);
    expect(rules.skipped).toMatchObject([{ vocabularyId: null, sourcePattern: "^\\bfoo$" }]);
  });

  it("ignores a vocabulary without a pattern", () => {
    expect(getXmlSchemaRules(structureClass([assignment("must", null, "none")]))).toStrictEqual({ everyValue: [], atLeastOne: [], skipped: [] });
  });
});
