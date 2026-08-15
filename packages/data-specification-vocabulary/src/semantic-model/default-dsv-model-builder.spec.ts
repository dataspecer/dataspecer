import { describe, test, expect } from "vitest";

import { createDefaultApplicationProfileBuilder } from "./default-dsv-model-builder.ts";
import { Cardinality, ClassRole, RequirementLevel } from "./dsv-model.ts";

describe("DefaultApplicationProfileBuilder", () => {

  test("Builds a class profile with defaults.", () => {
    const builder = createDefaultApplicationProfileBuilder({
      iri: "http://example.com/model",
    });
    const person = builder.classProfile({ iri: "http://example.com/person" });
    const actual = builder.build();

    expect(person.identifier).toBe("http://example.com/person");
    expect(actual).toStrictEqual({
      iri: "http://example.com/model",
      externalDocumentationUrl: null,
      classProfiles: [{
        type: ["class-profile"],
        iri: "http://example.com/person",
        prefLabel: {},
        definition: {},
        usageNote: {},
        profileOfIri: [],
        reusesPropertyValue: [],
        specializationOfIri: [],
        externalDocumentationUrl: null,
        profiledClassIri: [],
        classRole: ClassRole.undefined,
      }],
      datatypePropertyProfiles: [],
      objectPropertyProfiles: [],
    });
  });

  test("Auto-generates sequential IRIs prefixed with baseIdentifier when none is given.", () => {
    const builder = createDefaultApplicationProfileBuilder({
      iri: "http://example.com/model",
      baseIdentifier: "http://example.com/model#",
    });
    const first = builder.classProfile();
    const second = builder.classProfile();

    expect(first.identifier).toBe("http://example.com/model#classProfile#001");
    expect(second.identifier).toBe("http://example.com/model#classProfile#002");
  });

  test("Auto-generates sequential IRIs for datatype and object properties too.", () => {
    const builder = createDefaultApplicationProfileBuilder({
      iri: "http://example.com/model",
      baseIdentifier: "http://example.com/model#",
    });
    const datatype = builder.datatypeProperty();
    const object = builder.objectProperty();

    expect(datatype.identifier).toBe("http://example.com/model#property#001");
    expect(object.identifier).toBe("http://example.com/model#property#002");
  });

  test("profilesClass/profileOf/specializes push onto the right IRI arrays, without duplicates.", () => {
    const builder = createDefaultApplicationProfileBuilder({ iri: "http://example.com/model" });
    const base = builder.classProfile({ iri: "http://example.com/base" });
    const parent = builder.classProfile({ iri: "http://example.com/parent" });

    const child = builder.classProfile({ iri: "http://example.com/child" })
      .profilesClass("http://example.com/vocabulary#thing", "http://example.com/vocabulary#thing")
      .profileOf(base)
      .specializes(parent)
      .build();

    expect(child.profiledClassIri).toStrictEqual(["http://example.com/vocabulary#thing"]);
    expect(child.profileOfIri).toStrictEqual(["http://example.com/base"]);
    expect(child.specializationOfIri).toStrictEqual(["http://example.com/parent"]);
  });

  test("reuses and reusesNameAndDescription push PropertyValueReuse entries.", () => {
    const builder = createDefaultApplicationProfileBuilder({ iri: "http://example.com/model" });
    const source = builder.classProfile({ iri: "http://example.com/source" });

    const profile = builder.classProfile({ iri: "http://example.com/profile" })
      .reuses({ property: "http://example.com/customProperty", from: source })
      .reusesNameAndDescription(source)
      .build();

    expect(profile.reusesPropertyValue).toStrictEqual([{
      reusedPropertyIri: "http://example.com/customProperty",
      reusedAsPropertyIri: "http://example.com/customProperty",
      propertyReusedFromResourceIri: "http://example.com/source",
    }, {
      reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
      reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
      propertyReusedFromResourceIri: "http://example.com/source",
    }, {
      reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
      reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
      propertyReusedFromResourceIri: "http://example.com/source",
    }]);
  });

  test("reuses respects an explicit `as` override.", () => {
    const builder = createDefaultApplicationProfileBuilder({ iri: "http://example.com/model" });
    const source = builder.classProfile({ iri: "http://example.com/source" });

    const profile = builder.classProfile({ iri: "http://example.com/profile" })
      .reuses({ property: "http://example.com/a", as: "http://example.com/b", from: source })
      .build();

    expect(profile.reusesPropertyValue).toStrictEqual([{
      reusedPropertyIri: "http://example.com/a",
      reusedAsPropertyIri: "http://example.com/b",
      propertyReusedFromResourceIri: "http://example.com/source",
    }]);
  });

  test("main/supportive set classRole.", () => {
    const builder = createDefaultApplicationProfileBuilder({ iri: "http://example.com/model" });

    expect(builder.classProfile().main().build().classRole).toBe(ClassRole.main);
    expect(builder.classProfile().supportive().build().classRole).toBe(ClassRole.supportive);
  });

  test("Builds a datatype property profile with domain, range, and requirement level.", () => {
    const builder = createDefaultApplicationProfileBuilder({ iri: "http://example.com/model" });
    const domain = builder.classProfile({ iri: "http://example.com/domain" });

    const property = builder.datatypeProperty({ iri: "http://example.com/property" })
      .domain(domain)
      .range("http://www.w3.org/2001/XMLSchema#string")
      .profilesProperty("http://example.com/vocabulary#name")
      .mandatory()
      .build();

    expect(property).toStrictEqual({
      type: ["datatype-property-profile"],
      iri: "http://example.com/property",
      prefLabel: {},
      definition: {},
      usageNote: {},
      profileOfIri: [],
      reusesPropertyValue: [],
      specializationOfIri: [],
      externalDocumentationUrl: null,
      cardinality: null,
      domainIri: "http://example.com/domain",
      profiledPropertyIri: ["http://example.com/vocabulary#name"],
      requirementLevel: RequirementLevel.mandatory,
      rangeDataTypeIri: ["http://www.w3.org/2001/XMLSchema#string"],
    });
  });

  test("Builds an object property profile with a builder-referenced range class.", () => {
    const builder = createDefaultApplicationProfileBuilder({ iri: "http://example.com/model" });
    const domain = builder.classProfile({ iri: "http://example.com/domain" });
    const range = builder.classProfile({ iri: "http://example.com/range" });

    const property = builder.objectProperty()
      .domain(domain)
      .range(range)
      .optional()
      .build();

    expect(property.rangeClassIri).toStrictEqual(["http://example.com/range"]);
    expect(property.domainIri).toBe("http://example.com/domain");
    expect(property.requirementLevel).toBe(RequirementLevel.optional);
  });

  test("recommended() sets requirementLevel and supports a passed-in cardinality override.", () => {
    const builder = createDefaultApplicationProfileBuilder({ iri: "http://example.com/model" });

    const property = builder.objectProperty({ cardinality: Cardinality.ZeroToMany })
      .recommended()
      .build();

    expect(property.cardinality).toBe(Cardinality.ZeroToMany);
    expect(property.requirementLevel).toBe(RequirementLevel.recommended);
  });

  test("build() collects profiles in creation order across all three kinds.", () => {
    const builder = createDefaultApplicationProfileBuilder({ iri: "http://example.com/model" });
    builder.classProfile({ iri: "http://example.com/c1" });
    builder.classProfile({ iri: "http://example.com/c2" });
    builder.datatypeProperty({ iri: "http://example.com/d1" });
    builder.objectProperty({ iri: "http://example.com/o1" });

    const actual = builder.build();

    expect(actual.classProfiles.map(item => item.iri)).toStrictEqual([
      "http://example.com/c1", "http://example.com/c2",
    ]);
    expect(actual.datatypePropertyProfiles.map(item => item.iri)).toStrictEqual(["http://example.com/d1"]);
    expect(actual.objectPropertyProfiles.map(item => item.iri)).toStrictEqual(["http://example.com/o1"]);
  });

});
