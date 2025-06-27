import { describe, test, expect } from "vitest";
import { createDefaultSemanticModelBuilder } from "./semantic-model/semantic-model-builder.ts";
import { createDefaultProfileModelBuilder } from "./profile-model/profile-model-builder.ts";
import { createSemicShaclStylePolicy, createShaclForProfile } from "./shacl.ts";
import { shaclToRdf } from "./shacl-to-rdf.ts";
import { SemanticModel } from "./semantic-model/semantic-model.ts";
import { createReadOnlyInMemoryEntityModel } from "./entity-model/index.ts";
import { InMemorySemanticModel } from "@dataspecer/core-v2/semantic-model/in-memory";
import { createReadOnlyInMemorySemanticModel } from "./semantic-model/semantic-model-factory.ts";

describe("createShaclForProfile", () => {

  const xsd = createDefaultSemanticModelBuilder(
    "http://www.w3.org/2001/XMLSchema#");

  const xsdString = xsd.class({ iri: "string" });

  const xsdProfile = createDefaultProfileModelBuilder(
    "http://example.com/xsdProfile#");

  const xsdStringProfile = xsdProfile.class({ iri: "string" })
    .profile(xsdString);

  test.skip("Implementation test I.", async () => {

    // Vocabulary

    const vocabulary = createDefaultSemanticModelBuilder(
      "http://example.com/vocabulary#");

    const object = vocabulary.class({ iri: "object" });

    const human = vocabulary.class({ iri: "human" });

    const name = human.property({
      iri: "name",
      name: { "en": "name" },
      range: xsdString,
    });

    const has = human.property({
      iri: "has",
      name: { "en": "has" },
      range: object,
    });

    // Profile

    const profile = createDefaultProfileModelBuilder(
      "http://example.com/profile#");

    const objectProfile = profile.class({ iri: "object" })
      .reuseName(object);

    const humanProfile = profile.class({ iri: "human" })
      .reuseName(human);

    profile.property({ iri: "name" })
      .reuseName(name)
      .domain(humanProfile)
      .range(xsdStringProfile);

    profile.property({ iri: "has" })
      .reuseName(has)
      .domain(humanProfile)
      .range(objectProfile);

    // Prepare SHACL

    const shacl = createShaclForProfile(
      [xsd.build(), vocabulary.build()],
      [xsdProfile.build()],
      profile.build(),
      createSemicShaclStylePolicy("http://example/shacl.ttl"));

    //

    expect(shacl.members.length).toBe(2);

    expect(shacl.members[0]!.targetClass)
      .toStrictEqual("http://example.com/vocabulary#object");

    const humanShape = shacl.members[1]!;
    expect(humanShape.targetClass)
      .toStrictEqual("http://example.com/vocabulary#human");

    expect(humanShape.propertyShapes.length).toBe(1);

    const hasShape = humanShape.propertyShapes[0]!;
    expect(hasShape.seeAlso)
      .toStrictEqual("http://example.com/profile#name");
    expect(hasShape.datatype)
      .toStrictEqual("http://www.w3.org/2001/XMLSchema#string");

    // console.log(await shaclToRdf(shacl, {}));
  });

  test("Implementation test II.", async () => {
    const entities = {
      "qrd5yim41smb6nx2r2": {
        "iri": "Citizen",
        "name": { "en": "Citizen" },
        "description": {},
        "externalDocumentationUrl": null,
        "id": "qrd5yim41smb6nx2r2",
        "type": ["class"],
      },
      "jrn5jfw8rt9mb6nxmyd": {
        "ends": [{
          "iri": null,
          "name": {},
          "description": {},
          "concept": "qrd5yim41smb6nx2r2",
          "externalDocumentationUrl": null
        }, {
          "name": { "en": "name" },
          "description": {},
          "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
          "iri": "name",
          "externalDocumentationUrl": ""
        }],
        "id": "jrn5jfw8rt9mb6nxmyd",
        "type": ["relationship"],
        "iri": null,
        "name": {},
        "description": {}
      }, "1fhzbd9vmycmb7rmuqz": {
        "iri": "Citizen",
        "profiling": ["qrd5yim41smb6nx2r2"],
        "name": { "en": "Citizen" },
        "nameFromProfiled": "qrd5yim41smb6nx2r2",
        "description": {},
        "descriptionFromProfiled": "qrd5yim41smb6nx2r2",
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "externalDocumentationUrl": null,
        "tags": [],
        "id": "1fhzbd9vmycmb7rmuqz",
        "type": ["class-profile"]
      }, "vjtwpvl3q9mb7rnje4": {
        "ends": [{
          "name": null,
          "nameFromProfiled": null,
          "description": null,
          "descriptionFromProfiled": null,
          "iri": null,
          "cardinality": null,
          "usageNote": null,
          "usageNoteFromProfiled": null,
          "profiling": [],
          "externalDocumentationUrl": null,
          "tags": [],
          "concept": "1fhzbd9vmycmb7rmuqz"
        }, {
          "name": { "": "Undefined" },
          "nameFromProfiled": "jrn5jfw8rt9mb6nxmyd",
          "description": {},
          "descriptionFromProfiled": "jrn5jfw8rt9mb6nxmyd",
          "iri": "Citizen.",
          "cardinality": null,
          "usageNote": {},
          "usageNoteFromProfiled": null,
          "profiling": ["jrn5jfw8rt9mb6nxmyd"],
          "externalDocumentationUrl": null,
          "tags": [],
          "concept": "http://www.w3.org/2000/01/rdf-schema#Literal"
        }],
        "id": "vjtwpvl3q9mb7rnje4",
        "type": ["relationship-profile"]
      }
    };

    const model = createReadOnlyInMemorySemanticModel(
      "https://example/",
      createReadOnlyInMemoryEntityModel("example-model", entities));

    const shacl = createShaclForProfile(
      [model], [model], model,
      createSemicShaclStylePolicy("http://example/shacl.ttl"));

  });

});

// tak idealne zacit nejakym casem bez opakovani trid a bez vicenasobnyho profilovani

// mit tam ty 4 typy kardinalit vlastnosti

// zohlednit recommended, pokud je nastaven, a udelat warning pokud neni hodnota
