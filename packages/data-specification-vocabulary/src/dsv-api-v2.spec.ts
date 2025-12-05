import { describe, test, expect } from "vitest";

import { ApplicationProfile, DatatypePropertyProfile, RequirementLevel, ClassRole, ClassProfile } from "./dsv-model.ts";
import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { createDefaultProfileModelBuilder } from "@dataspecer/profile-model";
import { createDataSpecificationVocabulary } from "./dsv-api-v2.ts";

describe("createDataSpecificationVocabulary", () => {

  const xsd = createDefaultSemanticModelBuilder({
    baseIdentifier: "xsd#",
    baseIri: "http://www.w3.org/2001/XMLSchema#",
  });

  const xsdString = xsd.class({ iri: "string" });

  test("Implementation test I.", () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder({
      baseIdentifier: "vocabualry#",
      baseIri: "http://example.com/vocabulary#",
    });

    const person = vocabulary.class({
      iri: "person",
      name: { "cs": "Osoba", "en": "Person" },
    });

    const name = person.property({
      iri: "name",
      name: { en: "name", cs: "Jméno" },
      description: { en: "Description" },
      range: xsdString,
    });

    // Profile

    const profile = createDefaultProfileModelBuilder({
      baseIdentifier: "profile#",
      baseIri: "http://example.com/profile#",
    });

    const humanProfile = profile.class({
      iri: "person",
    }).reuseName(person);

    profile.property({ iri: "name", usageNote: { cs: "Jméno osoby" } })
      .reuseName(name)
      .domain(humanProfile)
      .range(xsdString.absoluteIri());

    // DSV

    const actual = createDataSpecificationVocabulary({
      semantics: [xsd.build(), vocabulary.build()],
      profiles: [profile.build()],
    }, [profile.build()], { iri: "http://example.com/" });

    //

    const expected: ApplicationProfile = {
      iri: "http://example.com/",
      externalDocumentationUrl: null,
      classProfiles: [{
        type: ["class-profile"],
        classRole: ClassRole.undefined,
        definition: {},
        externalDocumentationUrl: null,
        iri: "http://example.com/profile#person",
        prefLabel: {},
        profileOfIri: [],
        profiledClassIri: [
          "http://example.com/vocabulary#person"
        ],
        reusesPropertyValue: [{
          propertyReusedFromResourceIri: "http://example.com/vocabulary#person",
          reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
        }],
        specializationOfIri: [],
        usageNote: {},
      }],
      datatypePropertyProfiles: [{
        type: ["datatype-property-profile"],
        cardinality: null,
        definition: {},
        externalDocumentationUrl: null,
        iri: "http://example.com/profile#name",
        prefLabel: {},
        profileOfIri: [],
        profiledPropertyIri: [
          "http://example.com/vocabulary#name"
        ],
        rangeDataTypeIri: ["http://www.w3.org/2001/XMLSchema#string"],
        reusesPropertyValue: [{
          propertyReusedFromResourceIri: "http://example.com/vocabulary#name",
          reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
        }],
        requirementLevel: RequirementLevel.undefined,
        specializationOfIri: [],
        usageNote: {"cs": "Jméno osoby"},
        domainIri: "http://example.com/profile#person",
      }],
      objectPropertyProfiles: [],
    };

    expect(actual).toStrictEqual(expected);

  });

});
