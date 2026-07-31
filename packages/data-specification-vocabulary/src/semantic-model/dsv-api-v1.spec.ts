import { test, expect } from "vitest";

import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { createDefaultProfileModelBuilder } from "@dataspecer/profile-model";
import { ApplicationProfile, Cardinality, ClassRole, RequirementLevel } from "./dsv-model.ts";
import { conceptualModelToEntityListContainer } from "./dsv-to-entity-model.ts";
import { dsvToRdf } from "./dsv-to-rdf.ts";
import { createContext, entityListContainerToDsvModel } from "./entity-model-to-dsv.ts";
import { rdfToDsv } from "./rdf-to-dsv.ts";
import { mergeEntityListContainers, toEntityListContainer } from "./entity-list-container-builder.ts";
import { DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL } from "./vocabulary.ts";

test("End to end test I.", async () => {

  const vocabulary = createDefaultSemanticModelBuilder({
    baseIdentifier: "v#",
    baseIri: "http://dcat/model/",
  });
  const flatBack = vocabulary.class({ iri: "flatBack", name: { en: "Flat Back" } });
  const sweetState = vocabulary.class({ iri: "http://localhost/sweetState", name: { en: "Sweet State" } });
  const drabMoment = sweetState.property({
    iri: "drabMoment", name: { en: "Drab Moment" }, range: flatBack,
  });
  const tightArt = sweetState.property({
    iri: "tightArt", name: { en: "Tight Art" },
    range: { identifier: "http://www.w3.org/2000/01/rdf-schema#Literal" },
  });

  const profile = createDefaultProfileModelBuilder({
    baseIdentifier: "p#",
    baseIri: "http://dcat/model/",
  });
  const sweetState1 = profile.class({
    iri: "sweetState1",
    externalDocumentationUrl: "external-doc-1",
  })
    .reuseName(sweetState)
    .reuseDescription(sweetState);
  const flatBack1 = profile.class({
    iri: "flatBack1",
    name: { en: "Flat Back Changed in Profile" },
    description: { en: "Changed in profile" },
    usageNote: { en: "usage note" },
    externalDocumentationUrl: "external-doc-2",
    tags: [DSV_CLASS_ROLE.supportive],
  })
    .profile(flatBack);

  const sweetStateDrabMoment = profile.property({
    iri: "SweetState.drabMoment",
    cardinality: [0, null],
  })
    .domain(sweetState1)
    .range(flatBack1)
    .reuseName(drabMoment)
    .reuseDescription(drabMoment)
    .recommended();
  // profile-model's builder doesn't yet forward externalDocumentationUrl
  // onto a property's range end; set it directly on the underlying entity.
  (sweetStateDrabMoment as any).entity.ends[1].externalDocumentationUrl = "external-doc-4";

  const sweetStateTightArtChanges = profile.property({
    iri: "SweetState.tightArtChanges",
    cardinality: [0, null],
  })
    .domain(sweetState1)
    .range("http://www.w3.org/2000/01/rdf-schema#Literal")
    .reuseName(tightArt)
    .reuseDescription(tightArt)
    .recommended();
  (sweetStateTightArtChanges as any).entity.ends[1].externalDocumentationUrl = "external-doc-4";

  const container = mergeEntityListContainers(
    toEntityListContainer(vocabulary.build()),
    toEntityListContainer(profile.build()),
  );

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
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://localhost/sweetState"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
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
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/tightArt"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
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
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/drabMoment"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
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

  expect(dsvModel).toMatchObject(expectedConceptualModel);

  // We go to RDF and back.
  const actualRdf = await dsvToRdf(dsvModel, {});
  const parsedConceptualModel = (await rdfToDsv(actualRdf))[0]!;
  expect(parsedConceptualModel).toStrictEqual(dsvModel);

  const iriToIdentifier: Record<string, string> = {
    "http://dcat/model/sweetState1": sweetState1.identifier,
    "http://dcat/model/flatBack1": flatBack1.identifier,
    "http://dcat/model/SweetState.drabMoment": sweetStateDrabMoment.identifier,
    "http://dcat/model/SweetState.tightArtChanges": sweetStateTightArtChanges.identifier,
    // Vocabulary
    "http://dcat/model/flatBack": flatBack.identifier,
    "http://dcat/model/tightArt": tightArt.identifier,
    "http://localhost/sweetState": sweetState.identifier,
    "http://dcat/model/drabMoment": drabMoment.identifier,
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
      "profiling": [sweetState.identifier],
      "name": {},
      "nameFromProfiled": sweetState.identifier,
      "description": {},
      "descriptionFromProfiled": sweetState.identifier,
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "id": sweetState1.identifier,
      "type": ["class-profile"],
      "externalDocumentationUrl": "external-doc-1",
      "tags": [],
    }, {
      "id": flatBack1.identifier,
      "type": ["class-profile"],
      "description": { "en": "Changed in profile" },
      "descriptionFromProfiled": null,
      "name": { "en": "Flat Back Changed in Profile" },
      "nameFromProfiled": null,
      "iri": "flatBack1",
      "usageNote": { "en": "usage note" },
      "usageNoteFromProfiled": null,
      "profiling": [flatBack.identifier],
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
        "cardinality": null,
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": [],
        "concept": sweetState1.identifier,
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "name": {},
        "nameFromProfiled": tightArt.identifier,
        "description": {},
        "descriptionFromProfiled": tightArt.identifier,
        "iri": "SweetState.tightArtChanges",
        "cardinality": [0, null],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": [tightArt.identifier],
        "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
        "externalDocumentationUrl": "external-doc-4",
        "tags": [DSV_MANDATORY_LEVEL.recommended],
      }],
      "id": sweetStateTightArtChanges.identifier,
      "type": ["relationship-profile"]
    }, {
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
        "concept": sweetState1.identifier,
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "name": {},
        "nameFromProfiled": drabMoment.identifier,
        "description": {},
        "descriptionFromProfiled": drabMoment.identifier,
        "iri": "SweetState.drabMoment",
        "cardinality": [0, null],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "profiling": [drabMoment.identifier],
        "concept": flatBack1.identifier,
        "externalDocumentationUrl": "external-doc-4",
        "tags": [DSV_MANDATORY_LEVEL.recommended],
      }],
      "id": sweetStateDrabMoment.identifier,
      "type": ["relationship-profile"]
    }],
  };

  expect(parsedContainer).toMatchObject(expectedContainer);

});

test("Issue #1005", async () => {

  const vocabulary = createDefaultSemanticModelBuilder({
    baseIdentifier: "v#",
    baseIri: "http://dcat/model/",
  });
  const bulkyForce = vocabulary.class({ iri: "bulkyForce", name: { en: "Bulky Force" } });
  const juicyBusiness = vocabulary.class({ iri: "juicyBusiness", name: { en: "Juicy Business" } });
  const juicyWork = bulkyForce.property({
    iri: "juicyWork", name: { en: "Juicy Work" }, range: juicyBusiness,
  });

  const profile = createDefaultProfileModelBuilder({
    baseIdentifier: "p#",
    baseIri: "http://dcat/model/",
  });
  const juicyBusinessProfile = profile.class({
    iri: "juicyBusinessProfile",
    name: { en: "Juicy Business" },
  })
    .reuseDescription(juicyBusiness);
  const bulkyForceProfile = profile.class({
    iri: "bulkyForceProfile",
    name: { en: "Bulky Force" },
  })
    .reuseDescription(bulkyForce);
  // bulkyForceProfile specializes juicyBusinessProfile.
  profile.generalization(juicyBusinessProfile, bulkyForceProfile);

  const bulkyForceJuicyWork = profile.property({
    iri: "BulkyForce.juicyWork",
    name: { en: "Juicy Work" },
  })
    .domain(bulkyForceProfile)
    .range(juicyBusinessProfile)
    .profile(juicyWork);
  const juicyBusinessJuicyWorkSpecial = profile.property({
    iri: "JuicyBusiness.juicyWorkSpecial",
    name: { en: "Juicy Work" },
  })
    .domain(bulkyForceProfile)
    .range(juicyBusinessProfile)
    .profile(juicyWork);
  // juicyBusinessJuicyWorkSpecial specializes bulkyForceJuicyWork.
  profile.generalization(bulkyForceJuicyWork, juicyBusinessJuicyWorkSpecial);

  const container = mergeEntityListContainers(
    toEntityListContainer(vocabulary.build()),
    toEntityListContainer(profile.build()),
  );

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
  dsv:reusedAsProperty skos:definition;
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
  dsv:reusedAsProperty skos:definition;
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
    "http://dcat/model/bulkyForce": bulkyForce.identifier,
    "http://dcat/model/juicyBusiness": juicyBusiness.identifier,
    "http://dcat/model/juicyBusinessProfile": juicyBusinessProfile.identifier,
    "http://dcat/model/bulkyForceProfile": bulkyForceProfile.identifier,
    "http://dcat/model/juicyWork": juicyWork.identifier,
    "http://dcat/model/BulkyForce.juicyWork": bulkyForceJuicyWork.identifier,
    "http://dcat/model/JuicyBusiness.juicyWorkSpecial": juicyBusinessJuicyWorkSpecial.identifier,
  };

  let counter = 0;
  const parsedContainer = conceptualModelToEntityListContainer(
    parsedConceptualModel, {
    generalizationIdentifier: () => `id-${++counter}`,
    iriToIdentifier: iri => iriToIdentifier[iri] ?? `MISSING ${iri}`,
    iriUpdate: iri => iri.replace("http://dcat/model/", ""),
  });

  // We can not use the original one as there are only profiles.
  expect(parsedContainer).toMatchObject({
    baseIri: "",
    entities: [{
      id: juicyBusinessProfile.identifier,
      iri: "juicyBusinessProfile",
      type: ["class-profile"],
      name: { en: "Juicy Business" },
      nameFromProfiled: null,
      description: {},
      descriptionFromProfiled: juicyBusiness.identifier,
      profiling: [juicyBusiness.identifier],
      usageNote: {},
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }, {
      id: bulkyForceProfile.identifier,
      iri: "bulkyForceProfile",
      type: ["class-profile"],
      name: { en: "Bulky Force" },
      nameFromProfiled: null,
      description: {},
      descriptionFromProfiled: bulkyForce.identifier,
      profiling: [bulkyForce.identifier],
      usageNote: {},
      usageNoteFromProfiled: null,
      externalDocumentationUrl: null,
      tags: [],
    }, {
      id: "id-1",
      child: bulkyForceProfile.identifier,
      parent: juicyBusinessProfile.identifier,
      type: ["generalization"],
    }, {
      id: bulkyForceJuicyWork.identifier,
      type: ["relationship-profile"],
      ends: [{
        concept: bulkyForceProfile.identifier,
      }, {
        iri: "BulkyForce.juicyWork",
        name: { en: "Juicy Work" },
        nameFromProfiled: null,
        profiling: [juicyWork.identifier],
        concept: juicyBusinessProfile.identifier,
      }],
    }, {
      id: juicyBusinessJuicyWorkSpecial.identifier,
      type: ["relationship-profile"],
      ends: [{
        concept: bulkyForceProfile.identifier,
      }, {
        iri: "JuicyBusiness.juicyWorkSpecial",
        name: { en: "Juicy Work" },
        nameFromProfiled: null,
        profiling: [juicyWork.identifier],
        concept: juicyBusinessProfile.identifier,
      }],
    }, {
      id: "id-2",
      child: juicyBusinessJuicyWorkSpecial.identifier,
      parent: bulkyForceJuicyWork.identifier,
      type: ["generalization"],
    }],
  });

});
