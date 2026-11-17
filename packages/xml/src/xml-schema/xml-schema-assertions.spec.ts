import { describe, expect, it } from "vitest";
import type { ConceptualModelControlledVocabularyAssignment } from "@dataspecer/generators/conceptual-model/model";
import { StructureModelClass, StructureModelComplexType, StructureModelPrimitiveType, StructureModelProperty } from "@dataspecer/generators/structure-model/model";
import { createAtLeastOneAssertions } from "./xml-schema-assertions.ts";

const PATTERN_A = "^http://example\\.com/cv-a/[a-z]+$";
const PATTERN_B = "^http://example\\.com/cv-b/[0-9]+$";

function assignment(qualifier: "must" | "at-least-one" | "recommended" | "may", pattern: string, id: string): ConceptualModelControlledVocabularyAssignment {
  return {
    id: `assignment-${id}`,
    qualifier,
    vocabulary: { id, iri: null, title: {}, pattern, references: "", conformsToSkos: false },
  };
}

function classWith(label: string, assignments: ConceptualModelControlledVocabularyAssignment[], configure: (cls: StructureModelClass) => void = () => {}): StructureModelClass {
  const result = new StructureModelClass();
  result.technicalLabel = label;
  result.iris = [`http://example.com/${label}`];
  result.controlledVocabularies = assignments;
  configure(result);
  return result;
}

function propertyTo(label: string, ...valueClasses: StructureModelClass[]): StructureModelProperty {
  const result = new StructureModelProperty();
  result.technicalLabel = label;
  result.dataTypes = valueClasses.map((valueClass) => Object.assign(new StructureModelComplexType(), { dataType: valueClass }));
  return result;
}

function parentWith(...properties: StructureModelProperty[]): StructureModelClass {
  const result = new StructureModelClass();
  result.technicalLabel = "dataset";
  result.properties = properties;
  return result;
}

const AT_LEAST_ONE_A = [assignment("at-least-one", PATTERN_A, "vocabulary-a")];

describe("assertions requiring at least one value of a controlled vocabulary", () => {
  it("is satisfied by a property without values and by a value that matches the pattern", () => {
    const parent = parentWith(propertyTo("distribution", classWith("distribution", AT_LEAST_ONE_A)));

    expect(createAtLeastOneAssertions(parent, false)).toStrictEqual({
      assertions: [{
        test: "not(*:distribution) or *:distribution/*:iri[matches(., '^(http://example\\.com/cv-a/[a-z]+)$')]",
        controlledVocabularyId: "vocabulary-a",
      }],
      unsupported: [],
    });
  });

  it("checks the iri attribute when the IRI is written as an attribute", () => {
    const parent = parentWith(propertyTo("distribution", classWith("distribution", AT_LEAST_ONE_A)));

    expect(createAtLeastOneAssertions(parent, true).assertions[0]!.test)
      .toBe("not(*:distribution) or *:distribution/@iri[matches(., '^(http://example\\.com/cv-a/[a-z]+)$')]");
  });

  it("anchors the converted pattern only once", () => {
    const [assertion] = createAtLeastOneAssertions(parentWith(propertyTo("p", classWith("v", AT_LEAST_ONE_A))), false).assertions;

    expect(assertion!.test).not.toContain("^^");
    expect(assertion!.test).not.toContain("$$");
    expect(assertion!.test).toContain("'^(http://example");
  });

  it("makes an assertion of its own for each rule, so every one of them has to be satisfied", () => {
    const parent = parentWith(propertyTo("p", classWith("v", [assignment("at-least-one", PATTERN_A, "a"), assignment("at-least-one", PATTERN_B, "b")])));

    const { assertions } = createAtLeastOneAssertions(parent, false);

    expect(assertions.map((assertion) => assertion.controlledVocabularyId)).toStrictEqual(["a", "b"]);
    expect(assertions[1]!.test).toContain("cv-b");
  });

  it("makes assertions for each property whose class has a rule", () => {
    const parent = parentWith(
      propertyTo("first", classWith("v1", AT_LEAST_ONE_A)),
      propertyTo("second", classWith("v2", [assignment("at-least-one", PATTERN_B, "b")])),
      propertyTo("third", classWith("v3", [])),
    );

    const { assertions } = createAtLeastOneAssertions(parent, false);

    expect(assertions.map((assertion) => assertion.test.match(/\*:(\w+)\/\*:iri/)![1])).toStrictEqual(["first", "second"]);
  });

  it("follows the option of the class for a recommended vocabulary", () => {
    const recommended = [assignment("recommended", PATTERN_A, "a")];
    const withOption = (require: boolean) => parentWith(propertyTo("p", classWith("v", recommended, (cls) => {
      cls.requireRecommendedControlledVocabularyValue = require;
    })));

    expect(createAtLeastOneAssertions(withOption(true), false).assertions).toHaveLength(1);
    expect(createAtLeastOneAssertions(withOption(false), false).assertions).toHaveLength(0);
  });

  it("does not make an assertion for rules that restrict every value", () => {
    const parent = parentWith(propertyTo("p", classWith("v", [assignment("must", PATTERN_A, "a"), assignment("may", PATTERN_B, "b")])));

    expect(createAtLeastOneAssertions(parent, false)).toStrictEqual({ assertions: [], unsupported: [] });
  });

  it("doubles an apostrophe of the pattern, which would otherwise end the XPath string", () => {
    const parent = parentWith(propertyTo("p", classWith("v", [assignment("at-least-one", "^it's$", "a")])));

    expect(createAtLeastOneAssertions(parent, false).assertions[0]!.test).toContain("'^(it''s)$'");
  });

  it("leaves out a pattern that cannot be converted, which the class of the value reports itself", () => {
    const parent = parentWith(propertyTo("p", classWith("v", [assignment("at-least-one", "^(?=a)b$", "a"), assignment("at-least-one", PATTERN_B, "b")])));

    const { assertions, unsupported } = createAtLeastOneAssertions(parent, false);

    expect(assertions.map((assertion) => assertion.controlledVocabularyId)).toStrictEqual(["b"]);
    expect(unsupported).toStrictEqual([]);
  });

  it("takes the properties of a container, whose elements are in the element of the class", () => {
    const container = classWith("container", []);
    container.properties = [propertyTo("inner", classWith("v", AT_LEAST_ONE_A))];
    const containerProperty = propertyTo("choice", container);
    containerProperty.propertyAsContainer = "choice";

    const { assertions } = createAtLeastOneAssertions(parentWith(containerProperty), false);

    expect(assertions).toHaveLength(1);
    expect(assertions[0]!.test).toContain("*:inner");
  });

  it("ignores attributes and properties with a primitive type", () => {
    const attribute = propertyTo("attribute", classWith("v", AT_LEAST_ONE_A));
    attribute.xmlIsAttribute = true;
    const primitive = new StructureModelProperty();
    primitive.technicalLabel = "title";
    primitive.dataTypes = [Object.assign(new StructureModelPrimitiveType(), { dataType: "http://www.w3.org/2001/XMLSchema#string" })];

    expect(createAtLeastOneAssertions(parentWith(attribute, primitive), false)).toStrictEqual({ assertions: [], unsupported: [] });
  });
});

describe("rules that cannot be written as an assertion", () => {
  it("are reported for a property with several types", () => {
    const parent = parentWith(propertyTo("p", classWith("v1", AT_LEAST_ONE_A), classWith("v2", [])));

    const { assertions, unsupported } = createAtLeastOneAssertions(parent, false);

    expect(assertions).toStrictEqual([]);
    expect(unsupported).toStrictEqual(["property p of class dataset has several types"]);
  });

  it("are reported for a property with several types in an or", () => {
    const property = propertyTo("p", classWith("v", AT_LEAST_ONE_A));
    property.isInOr = true;

    expect(createAtLeastOneAssertions(parentWith(property), false).unsupported).toHaveLength(1);
  });

  it("are reported for a class that comes from another schema", () => {
    const parent = parentWith(propertyTo("p", classWith("v", AT_LEAST_ONE_A, (cls) => { cls.isReferenced = true; })));

    expect(createAtLeastOneAssertions(parent, false)).toStrictEqual({
      assertions: [],
      unsupported: ["property p of class dataset has a class that comes from another schema"],
    });
  });

  it("are reported for a class without an IRI", () => {
    const never = parentWith(propertyTo("p", classWith("v", AT_LEAST_ONE_A, (cls) => { cls.instancesHaveIdentity = "NEVER"; })));
    const noIris = parentWith(propertyTo("p", classWith("v", AT_LEAST_ONE_A, (cls) => { cls.iris = []; })));

    expect(createAtLeastOneAssertions(never, false).unsupported).toStrictEqual(["property p of class dataset has a class without an IRI"]);
    expect(createAtLeastOneAssertions(noIris, false).unsupported).toHaveLength(1);
  });

  it("are not reported for a property that has no such rule", () => {
    const parent = parentWith(propertyTo("p", classWith("v1", []), classWith("v2", [])));

    expect(createAtLeastOneAssertions(parent, false)).toStrictEqual({ assertions: [], unsupported: [] });
  });
});
