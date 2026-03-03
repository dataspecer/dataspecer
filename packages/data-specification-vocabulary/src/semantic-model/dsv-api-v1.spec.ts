import { test, expect } from "vitest";

import { SemanticModelClassProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { Cardinality, ApplicationProfile, DatatypePropertyProfile, ObjectPropertyProfile, RequirementLevel, ClassRole, ClassProfile } from "./dsv-model.ts";
import { conceptualModelToEntityListContainer } from "./dsv-to-entity-model.ts";
import { dsvToRdf } from "./dsv-to-rdf.ts";
import { EntityListContainer } from "./entity-model.ts";
import { createContext, entityListContainerToDsvModel } from "./entity-model-to-dsv.ts";
import { rdfToDsv } from "./rdf-to-dsv.ts";
import { DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL } from "./vocabulary.ts";

test("End to end test I.", async () => {

  const container = {
    "baseIri": "http://dcat/model/",
    "entities": [{
      "id": "lqo2gocgg4sm7d1ivqx",
      "iri": "flatBack",
      "type": ["class"],
      "name": { "en": "Flat Back" },
      "description": {}
    }, {
      "id": "xg0kzal0g2m7d1ix6t",
      "iri": "http://localhost/sweetState",
      "type": ["class"],
      "name": { "en": "Sweet State" },
      "description": {}
    }, {
      "id": "u42wg5rcg2im7d1j3hm",
      "type": ["relationship"],
      "iri": null,
      "name": {},
      "description": {},
      "ends": [{
        "name": {},
        "description": {},
        "cardinality": null,
        "concept": "xg0kzal0g2m7d1ix6t",
        "iri": null
      }, {
        "name": { "en": "Drab Moment" },
        "description": {},
        "cardinality": null,
        "concept": "lqo2gocgg4sm7d1ivqx",
        "iri": "drabMoment"
      }]
    }, {
      "id": "ml7qgk4tl6sm7d1j6lj",
      "type": ["relationship"],
      "iri": null,
      "name": {},
      "description": {},
      "ends": [{
        "name": {},
        "description": {},
        "concept": "lqo2gocgg4sm7d1ivqx",
        "iri": null
      }, {
        "name": { "en": "Energetic Problem" },
        "description": {},
        "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
        "iri": "energeticProblem"
      }]
    }, {
      "id": "rz94ir172eqm7d1j8i2",
      "type": ["relationship"],
      "iri": null,
      "name": {},
      "description": {},
      "ends": [{
        "name": {},
        "description": {},
        "concept": "xg0kzal0g2m7d1ix6t",
        "iri": null
      }, {
        "name": { "en": "Tight Art" },
        "description": {},
        "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
        "iri": "tightArt"
      }]
    }, {
      "id": "wa1svaft06dm7d1jcd8",
      "iri": "upsetProgram",
      "type": ["class"],
      "name": { "en": "Upset Program" },
      "description": {}
    }, {
      "id": "s4gk5aa3z48m7d1jgjh",
      "iri": null,
      "child": "lqo2gocgg4sm7d1ivqx",
      "parent": "wa1svaft06dm7d1jcd8",
      "type": ["generalization"]
    }, {
      "iri": "sweetState1",
      "profiling": ["xg0kzal0g2m7d1ix6t"],
      "name": { "en": "Sweet State" },
      "nameFromProfiled": "xg0kzal0g2m7d1ix6t",
      "description": {},
      "descriptionFromProfiled": "xg0kzal0g2m7d1ix6t",
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "id": "hwey2q71bvjm7d1jrlq",
      "type": ["class-profile"],
      "externalDocumentationUrl": "external-doc-1",
      "tags": [],
    } as SemanticModelClassProfile, {
      "id": "94kn5yss8dm7d1jv9z",
      "type": ["class-profile"],
      "description": { "en": "Changed in profile" },
      "descriptionFromProfiled": null,
      "name": { "en": "Flat Back Changed in Profile" },
      "nameFromProfiled": null,
      "iri": "flatBack1",
      "usageNote": { "en": "usage note" },
      "usageNoteFromProfiled": null,
      "profiling": ["lqo2gocgg4sm7d1ivqx"],
      "externalDocumentationUrl": "external-doc-2",
      "tags": [DSV_CLASS_ROLE.supportive],
    } as SemanticModelClassProfile, {
      "ends": [{
        "name": null,
        "nameFromProfiled": null,
        "description": null,
        "descriptionFromProfiled": null,
        "iri": null,
        "cardinality": [0, null],
        "usageNote": null,
        "usageNoteFromProfiled": null,
        "profiling": [],
        "concept": "hwey2q71bvjm7d1jrlq",
        "externalDocumentationUrl": "external-doc-3",
        "tags": [DSV_MANDATORY_LEVEL.optional],
      }, {
        "name": { "en": "Drab Moment" },
        "nameFromProfiled": "u42wg5rcg2im7d1j3hm",
        "description": {},
        "descriptionFromProfiled": "u42wg5rcg2im7d1j3hm",
        "iri": "SweetState.drabMoment",
        "cardinality": [0, null],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": ["u42wg5rcg2im7d1j3hm"],
        "concept": "94kn5yss8dm7d1jv9z",
        "externalDocumentationUrl": "external-doc-4",
        "tags": [DSV_MANDATORY_LEVEL.recommended],
      }],
      "id": "fk532ihkfa5m7d1k90e",
      "type": ["relationship-profile"],
    } as SemanticModelRelationshipProfile, {
      "id": "f9tj2irq2gm7d1lcrj",
      "type": ["relationship"],
      "iri": null,
      "name": {},
      "description": {},
      "ends": [{
        "name": {},
        "description": {},
        "cardinality": null,
        "concept": "xg0kzal0g2m7d1ix6t",
        "iri": null
      }, {
        "name": { "en": "Extensive Face" },
        "description": {},
        "cardinality": null,
        "concept": "lqo2gocgg4sm7d1ivqx",
        "iri": "extensiveFace"
      }]
    }, {
      "ends": [{
        "name": null,
        "nameFromProfiled": null,
        "description": null,
        "descriptionFromProfiled": null,
        "iri": null,
        "cardinality": [0, null],
        "usageNote": null,
        "usageNoteFromProfiled": null,
        "profiling": [],
        "concept": "hwey2q71bvjm7d1jrlq",
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "name": {},
        "nameFromProfiled": "rz94ir172eqm7d1j8i2",
        "description": {},
        "descriptionFromProfiled": "rz94ir172eqm7d1j8i2",
        "iri": "SweetState.tightArtChanges",
        "cardinality": [0, null],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": ["rz94ir172eqm7d1j8i2"],
        "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
        "externalDocumentationUrl": "external-doc-4",
        "tags": [DSV_MANDATORY_LEVEL.recommended],
      }],
      "id": "kss58ru9dom7d1omi4",
      "type": ["relationship-profile"]
    } as SemanticModelRelationshipProfile]
  } as EntityListContainer;

  const context = createContext([container]);

  const dsvModel = entityListContainerToDsvModel(
    "http://dcat/model/", container, context);

  const expectedConceptualModel: ApplicationProfile = {
    "iri": "http://dcat/model/",
    "externalDocumentationUrl": null,
    "classProfiles": [{
      "iri": "http://dcat/model/sweetState1",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "type": ["class-profile"],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://localhost/sweetState"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://localhost/sweetState"
      }],
      "profiledClassIri": ["http://localhost/sweetState"],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-doc-1",
      "classRole": ClassRole.undefined,
    }, {
      "iri": "http://dcat/model/flatBack1",
      "prefLabel": { "en": "Flat Back Changed in Profile" },
      "definition": { "en": "Changed in profile" },
      "usageNote": { "en": "usage note" },
      "profileOfIri": [],
      "type": ["class-profile"],
      "reusesPropertyValue": [],
      "profiledClassIri": ["http://dcat/model/flatBack"],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-doc-2",
      "classRole": ClassRole.supportive,
    }],
    "datatypePropertyProfiles": [{
      "iri": "http://dcat/model/SweetState.tightArtChanges",
      "cardinality": Cardinality.ZeroToMany,
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "profiledPropertyIri": ["http://dcat/model/tightArt"],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/tightArt"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/tightArt"
      }],
      "type": ["datatype-property-profile"],
      "rangeDataTypeIri": ["http://www.w3.org/2000/01/rdf-schema#Literal"],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-doc-4",
      "requirementLevel": RequirementLevel.recommended,
      "domainIri": "http://dcat/model/sweetState1",
    }],
    "objectPropertyProfiles": [{
      "iri": "http://dcat/model/SweetState.drabMoment",
      "cardinality": Cardinality.ZeroToMany,
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "profiledPropertyIri": ["http://dcat/model/drabMoment"],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/drabMoment"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/drabMoment"
      }],
      "type": ["object-property-profile"],
      "rangeClassIri": ["http://dcat/model/flatBack1"],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-doc-4",
      "requirementLevel": RequirementLevel.recommended,
      "domainIri": "http://dcat/model/sweetState1",
    }],
  };

  expect(dsvModel).toStrictEqual(expectedConceptualModel);

  // We go to RDF and back.
  const actualRdf = await dsvToRdf(dsvModel, {});
  const parsedConceptualModel = (await rdfToDsv(actualRdf))[0]!;
  expect(parsedConceptualModel).toStrictEqual(dsvModel);

  const iriToIdentifier: Record<string, string> = {
    "http://dcat/model/sweetState1": "hwey2q71bvjm7d1jrlq",
    "http://dcat/model/flatBack1": "94kn5yss8dm7d1jv9z",
    "http://dcat/model/SweetState.drabMoment": "fk532ihkfa5m7d1k90e",
    "http://dcat/model/SweetState.tightArtChanges": "kss58ru9dom7d1omi4",
    // Vocabulary
    "http://dcat/model/flatBack": "lqo2gocgg4sm7d1ivqx",
    "http://dcat/model/tightArt": "rz94ir172eqm7d1j8i2",
    "http://localhost/sweetState": "xg0kzal0g2m7d1ix6t",
    "http://dcat/model/drabMoment": "u42wg5rcg2im7d1j3hm",
    // Identity for test
    "http://www.w3.org/2000/01/rdf-schema#Literal": "http://www.w3.org/2000/01/rdf-schema#Literal",
  };

  let counter = 0;
  const parsedContainer = conceptualModelToEntityListContainer(
    parsedConceptualModel, {
    generalizationIdentifier: () => `id-${++counter}`,
    iriToIdentifier: iri => iriToIdentifier[iri] ?? `MISSING ${iri}`,
    iriUpdate: iri => iri.replace("http://dcat/model/", ""),
  });

  // We can not use the original one as there are only profiles.
  const expectedContainer = {
    "baseIri": "", // We can not detect the base IRI yet.
    "entities": [{
      "iri": "sweetState1",
      "profiling": ["xg0kzal0g2m7d1ix6t"],
      "name": {},
      "nameFromProfiled": "xg0kzal0g2m7d1ix6t",
      "description": {},
      "descriptionFromProfiled": "xg0kzal0g2m7d1ix6t",
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "id": "hwey2q71bvjm7d1jrlq",
      "type": ["class-profile"],
      "externalDocumentationUrl": "external-doc-1",
      "tags": [],
    }, {
      "id": "94kn5yss8dm7d1jv9z",
      "type": ["class-profile"],
      "description": { "en": "Changed in profile" },
      "descriptionFromProfiled": null,
      "name": { "en": "Flat Back Changed in Profile" },
      "nameFromProfiled": null,
      "iri": "flatBack1",
      "usageNote": { "en": "usage note" },
      "usageNoteFromProfiled": null,
      "profiling": ["lqo2gocgg4sm7d1ivqx"],
      "externalDocumentationUrl": "external-doc-2",
      "tags": [DSV_CLASS_ROLE.supportive],
    }, {
      "ends": [{
        "name": {},
        "nameFromProfiled": null,
        "description": {},
        "descriptionFromProfiled": null,
        "iri": null,
        // DSV does not support cardinality for domain.
        "cardinality": null, // [0, null],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": [],
        "concept": "hwey2q71bvjm7d1jrlq",
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "name": {},
        "nameFromProfiled": "rz94ir172eqm7d1j8i2",
        "description": {},
        "descriptionFromProfiled": "rz94ir172eqm7d1j8i2",
        "iri": "SweetState.tightArtChanges",
        "cardinality": [0, null],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": ["rz94ir172eqm7d1j8i2"],
        "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
        "externalDocumentationUrl": "external-doc-4",
        "tags": [DSV_MANDATORY_LEVEL.recommended],
      }],
      "id": "kss58ru9dom7d1omi4",
      "type": ["relationship-profile"]
    } as SemanticModelRelationshipProfile, {
      "ends": [{
        "name": {},
        "nameFromProfiled": null,
        "description": {},
        "descriptionFromProfiled": null,
        "iri": null,
        // DSV does not support cardinality for domain.
        "cardinality": null, // [0, null],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": [],
        "concept": "hwey2q71bvjm7d1jrlq",
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "name": {},
        "nameFromProfiled": "u42wg5rcg2im7d1j3hm",
        "description": {},
        "descriptionFromProfiled": "u42wg5rcg2im7d1j3hm",
        "iri": "SweetState.drabMoment",
        "cardinality": [0, null],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": ["u42wg5rcg2im7d1j3hm"],
        "concept": "94kn5yss8dm7d1jv9z",
        "externalDocumentationUrl": "external-doc-4",
        "tags": [DSV_MANDATORY_LEVEL.recommended],
      }],
      "id": "fk532ihkfa5m7d1k90e",
      "type": ["relationship-profile"]
    } as SemanticModelRelationshipProfile],
  } as EntityListContainer;

  expect(parsedContainer).toStrictEqual(expectedContainer);

});

test("Issue #1005", async () => {

  const container = {
    "baseIri": "http://dcat/model/",
    "entities": [{
      "id": "jv7zjcl0xnfm8lqej9v",
      "iri": "bulkyForce",
      "type": ["class"],
      "name": { "en": "Bulky Force" },
      "description": {},
    }, {
      "id": "dme1xc0ubemm8lqekg1",
      "iri": "juicyBusiness",
      "type": ["class"],
      "name": { "en": "Juicy Business" },
      "description": {},
    }, { // 2
      "id": "v5d9yd13by9m8mvndtv",
      "type": ["class-profile"],
      "description": {},
      "descriptionFromProfiled": "dme1xc0ubemm8lqekg1",
      "name": { "en": "Juicy Business" },
      "nameFromProfiled": null,
      "iri": "juicyBusinessProfile",
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "profiling": ["dme1xc0ubemm8lqekg1"],
      "externalDocumentationUrl": null,
      "tags": [],
    }, { // 3
      "id": "8ut1fqfcd2dm8mvnh2y",
      "type": ["class-profile"],
      "description": {},
      "descriptionFromProfiled": "jv7zjcl0xnfm8lqej9v",
      "name": { "en": "Bulky Force" },
      "nameFromProfiled": null,
      "iri": "bulkyForceProfile",
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "profiling": ["jv7zjcl0xnfm8lqej9v"],
      "externalDocumentationUrl": null,
      "tags": [],
    }, {
      "id": "flybrmenrykm8mwsi0o",
      "type": ["relationship"],
      "iri": null,
      "name": {},
      "description": {},
      "ends": [{
        "name": {},
        "description": {},
        "concept": "jv7zjcl0xnfm8lqej9v",
        "iri": null
      }, {
        "name": { "en": "Juicy Work" },
        "description": {},
        "concept": "dme1xc0ubemm8lqekg1",
        "iri": "juicyWork",
      }],
    }, { // 5
      "ends": [{
        "name": {},
        "nameFromProfiled": null,
        "description": {},
        "descriptionFromProfiled": null,
        "iri": null,
        "cardinality": null,
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": [],
        "concept": "8ut1fqfcd2dm8mvnh2y",
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "name": { "en": "Juicy Work" },
        "nameFromProfiled": null,
        "description": {},
        "descriptionFromProfiled": null,
        "iri": "BulkyForce.juicyWork",
        "cardinality": null,
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": ["flybrmenrykm8mwsi0o"],
        "concept": "v5d9yd13by9m8mvndtv",
        "externalDocumentationUrl": null,
        "tags": [],
      }],
      "id": "vaz6nlwa9am8mwszz2",
      "type": ["relationship-profile"],
    }, { // 6
      "id": "yjtb7fast5lm8mwtnpa",
      "iri": null,
      "child": "8ut1fqfcd2dm8mvnh2y",
      "parent": "v5d9yd13by9m8mvndtv",
      "type": ["generalization"],
    }, { // 7
      "id": "bv12356pl4im8mwu7ty",
      "type": ["relationship-profile"],
      "ends": [{
        "name": {},
        "nameFromProfiled": null,
        "description": {},
        "descriptionFromProfiled": null,
        "iri": null,
        "cardinality": null,
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": [],
        "concept": "8ut1fqfcd2dm8mvnh2y",
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "name": { "en": "Juicy Work" },
        "nameFromProfiled": null,
        "description": {},
        "descriptionFromProfiled": null,
        "iri": "JuicyBusiness.juicyWorkSpecial",
        "cardinality": null,
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": ["flybrmenrykm8mwsi0o"],
        "concept": "v5d9yd13by9m8mvndtv",
        "externalDocumentationUrl": null,
        "tags": [],
      }],
    }, { // 8
      "id": "yjtb5fasdt5lm9mwtbcb",
      "iri": null,
      "child": "bv12356pl4im8mwu7ty",
      "parent": "vaz6nlwa9am8mwszz2",
      "type": ["generalization"],
    }],
  };

  const context = createContext([container]);

  const dsvModel = entityListContainerToDsvModel(
    "http://dcat/model/", container, context);

  // We go to RDF and back.
  const actualRdf = await dsvToRdf(dsvModel, {});

  const expectedRdf = `@prefix : <http://dcat/model/>.
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix dct: <http://purl.org/dc/terms/>.
@prefix dsv: <https://w3id.org/dsv#>.
@prefix owl: <http://www.w3.org/2002/07/owl#>.
@prefix skos: <http://www.w3.org/2004/02/skos/core#>.
@prefix vann: <http://purl.org/vocab/vann/>.
@prefix cardinality: <https://w3id.org/dsv/cardinality#>.
@prefix requirement: <https://w3id.org/dsv/requirement-level#>.
@prefix role: <https://w3id.org/dsv/class-role#>.
@prefix prof: <http://www.w3.org/ns/dx/prof/>.


<http://dcat/model/> a prof:Profile, dsv:ApplicationProfile.
:juicyBusinessProfile dct:isPartOf <http://dcat/model/>;
    a dsv:TermProfile;
    skos:prefLabel "Juicy Business"@en;
    dsv:reusesPropertyValue [
  a dsv:PropertyValueReuse;
  dsv:reusedProperty skos:definition;
  dsv:reusedFromResource :juicyBusiness
];
    a dsv:ClassProfile;
    dsv:class :juicyBusiness.
:bulkyForceProfile dct:isPartOf <http://dcat/model/>;
    a dsv:TermProfile;
    skos:prefLabel "Bulky Force"@en;
    dsv:specializes :juicyBusinessProfile;
    dsv:reusesPropertyValue [
  a dsv:PropertyValueReuse;
  dsv:reusedProperty skos:definition;
  dsv:reusedFromResource :bulkyForce
];
    a dsv:ClassProfile;
    dsv:class :bulkyForce.

<http://dcat/model/BulkyForce.juicyWork> dct:isPartOf <http://dcat/model/>;
    a dsv:TermProfile;
    skos:prefLabel "Juicy Work"@en;
    dsv:property :juicyWork;
    dsv:domain :bulkyForceProfile;
    a dsv:ObjectPropertyProfile;
    dsv:objectPropertyRange :juicyBusinessProfile.

<http://dcat/model/JuicyBusiness.juicyWorkSpecial> dct:isPartOf <http://dcat/model/>;
    a dsv:TermProfile;
    skos:prefLabel "Juicy Work"@en;
    dsv:specializes <http://dcat/model/BulkyForce.juicyWork>;
    dsv:property :juicyWork;
    dsv:domain :bulkyForceProfile;
    a dsv:ObjectPropertyProfile;
    dsv:objectPropertyRange :juicyBusinessProfile.
`;

  expect(actualRdf).toStrictEqual(expectedRdf);

  const parsedConceptualModel = (await rdfToDsv(actualRdf))[0]!;

  const iriToIdentifier: Record<string, string> = {
    "http://dcat/model/bulkyForce": "jv7zjcl0xnfm8lqej9v",
    "http://dcat/model/juicyBusiness": "dme1xc0ubemm8lqekg1",
    "http://dcat/model/juicyBusinessProfile": "v5d9yd13by9m8mvndtv",
    "http://dcat/model/bulkyForceProfile": "8ut1fqfcd2dm8mvnh2y",
    "http://dcat/model/juicyWork": "flybrmenrykm8mwsi0o",
    "http://dcat/model/BulkyForce.juicyWork": "vaz6nlwa9am8mwszz2",
    "http://dcat/model/JuicyBusiness.juicyWorkSpecial": "bv12356pl4im8mwu7ty",
  };

  let counter = 0;
  const parsedContainer = conceptualModelToEntityListContainer(
    parsedConceptualModel, {
    generalizationIdentifier: () => `id-${++counter}`,
    iriToIdentifier: iri => iriToIdentifier[iri] ?? `MISSING ${iri}`,
    iriUpdate: iri => iri.replace("http://dcat/model/", ""),
  });

  // We can not use the original one as there are only profiles.
  expect(parsedContainer).toStrictEqual({
    baseIri: "",
    entities: [{
      ...container.entities[2],
      description: {},
    }, {
      ...container.entities[3],
      description: {},
    },
    {
      ...container.entities[6],
      id: "id-1"
    },
    container.entities[5],
    container.entities[7],
    {
      ...container.entities[8],
      id: "id-2"
    }]
  });

});
