import { SemanticModelEntity, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { SemanticModelClassProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { ClassRole, ApplicationProfile, RequirementLevel } from "./dsv-model.ts";
import { conceptualModelToEntityListContainer } from "./dsv-to-entity-model.ts";
import { EntityListContainer } from "./entity-model.ts";
import { entityListContainerToDsvModel, createContext } from "./entity-model-to-dsv.ts";
import { DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL, SKOS } from "./vocabulary.ts";

test("From DSV to entity model and back.", async () => {

  const dsv = {
    "iri": "http://dcat-ap-cz/model",
    "externalDocumentationUrl": null,
    "classProfiles": [{ // dcat-ap-0001
      "iri": "https://dcat-ap/#Dataset",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "reusesPropertyValue": [{
        "reusedPropertyIri": SKOS.scopeNote.id,
        "propertyReusedFromResourceIri": "http://www.w3.org/ns/dcat#Dataset"
      }],
      "type": ["class-profile"],
      "profiledClassIri": ["http://www.w3.org/ns/dcat#Dataset"],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-1",
      "classRole": ClassRole.main,
    }, { // dcat-ap-0002
      "iri": "https://dcat-ap-cz/#Dataset",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": ["https://dcat-ap/#Dataset"],
      "reusesPropertyValue": [],
      "type": ["class-profile"],
      "profiledClassIri": [],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-2",
      "classRole": ClassRole.supportive,
    }, { // dcat-ap-0003
      "iri": "http://dcat-ap/ns/dcat#Distribution",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "reusesPropertyValue": [],
      "type": ["class-profile"],
      "profiledClassIri": ["http://www.w3.org/ns/dcat#Distribution"],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-3",
      "classRole": ClassRole.undefined,
    }],
    "datatypePropertyProfiles": [],
    "objectPropertyProfiles": [{ // dcat-ap-0005
      "iri": "http://www.w3.org/ns/dcat#distribution-profile",
      "cardinality": "0-n",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "reusesPropertyValue": [],
      "profiledPropertyIri": ["http://www.w3.org/ns/dcat#distribution"],
      "type": ["object-property-profile"],
      "rangeClassIri": [
        "http://dcat-ap/ns/dcat#Distribution"
      ],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-5",
      "requirementLevel": RequirementLevel.optional,
      "domainIri": "https://dcat-ap/#Dataset",
    }],
    "specializationOfIri": [],
  } as ApplicationProfile;

  const iriToIdentifier: Record<string, string> = {
    "https://dcat-ap/#Dataset": "dcat-ap-0001",
    "https://dcat-ap-cz/#Dataset": "dcat-ap-0002",
    "http://dcat-ap/ns/dcat#Distribution": "dcat-ap-0003",
    "http://www.w3.org/ns/dcat#distribution-profile": "dcat-ap-0005",
    // Vocabulary
    "http://www.w3.org/ns/dcat#Dataset": "http://www.w3.org/ns/dcat#Dataset",
    "http://www.w3.org/ns/dcat#Distribution": "http://www.w3.org/ns/dcat#Distribution",
    "http://www.w3.org/ns/dcat#distribution": "http://www.w3.org/ns/dcat#distribution",
  };

  // Convert from DSV ConceptualModel to EntityListContainer with Entities.
  let counter = 0;
  const entityListContainer = conceptualModelToEntityListContainer(dsv, {
    generalizationIdentifier: () => `id-${++counter}`,
    iriToIdentifier: iri => iriToIdentifier[iri] ?? `MISSING ${iri}`,
  });

  const expectedEntityListContainer: EntityListContainer = {
    "baseIri": "",
    "entities": [{
      "id": "dcat-ap-0001",
      "profiling": ["http://www.w3.org/ns/dcat#Dataset"],
      "type": ["class-profile"],
      "iri": "https://dcat-ap/#Dataset",
      "name": {},
      "nameFromProfiled": null,
      "description": {},
      "descriptionFromProfiled": null,
      "usageNote": {},
      "usageNoteFromProfiled": "http://www.w3.org/ns/dcat#Dataset",
      "externalDocumentationUrl": "external-1",
      "tags": [DSV_CLASS_ROLE.main],
    } as SemanticModelClassProfile, {
      "id": "dcat-ap-0002",
      "profiling": ["dcat-ap-0001"],
      "type": ["class-profile"],
      "iri": "https://dcat-ap-cz/#Dataset",
      "name": {},
      "nameFromProfiled": null,
      "description": {},
      "descriptionFromProfiled": null,
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "externalDocumentationUrl": "external-2",
      "tags": [DSV_CLASS_ROLE.supportive],
    } as SemanticModelClassProfile, {
      "id": "dcat-ap-0003",
      "profiling": ["http://www.w3.org/ns/dcat#Distribution"],
      "type": ["class-profile"],
      "iri": "http://dcat-ap/ns/dcat#Distribution",
      "name": {},
      "nameFromProfiled": null,
      "description": {},
      "descriptionFromProfiled": null,
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "externalDocumentationUrl": "external-3",
      "tags": [],
    } as SemanticModelClassProfile, {
      "id": "dcat-ap-0005",
      "type": ["relationship-profile"],
      "ends": [{
        "name": {},
        "nameFromProfiled": null,
        "description": {},
        "descriptionFromProfiled": null,
        "cardinality": null,
        "concept": "dcat-ap-0001",
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "iri": null,
        "profiling": [],
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "name": {},
        "nameFromProfiled": null,
        "description": {},
        "descriptionFromProfiled": null,
        "cardinality": [0, null],
        "concept": "dcat-ap-0003",
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "iri": "http://www.w3.org/ns/dcat#distribution-profile",
        "profiling": ["http://www.w3.org/ns/dcat#distribution"],
        "externalDocumentationUrl": "external-5",
        "tags": [DSV_MANDATORY_LEVEL.optional],
      }]
    } as SemanticModelRelationshipProfile],
  };

  expect(entityListContainer).toStrictEqual(expectedEntityListContainer);

  // We need to add placeholder for a vocabulary, so we can properly
  // detect profiles or classes/relationships (from vocabulary) as
  // we need it to export to DSV properly. The reason is that DSV
  // utilize different predicate to profile profile or something
  // from a vocabulary.
  const vocabularyEntities: SemanticModelEntity[] = [{
    "id": "http://www.w3.org/ns/dcat#Dataset",
    "iri": "http://www.w3.org/ns/dcat#Dataset",
    "type": [
      "class"
    ],
  }, {
    "id": "http://www.w3.org/ns/dcat#Distribution",
    "iri": "http://www.w3.org/ns/dcat#Distribution",
    "type": [
      "class"
    ],
  }, {
    "id": "http://www.w3.org/ns/dcat#distribution",
    "iri": "http://www.w3.org/ns/dcat#distribution",
    "name": {},
    "description": {},
    "type": [
      "relationship"
    ],
    "ends": [{
      "iri": null,
      "concept": null,
    }, {
      "iri": null,
      "concept": null,
    }],
  } as SemanticModelRelationship];

  // Convert from EntityListContainer with entities to ConceptualModel.
  const context = createContext([entityListContainer, {
    baseIri: "http://dcat-ap-cz/model",
    entities: vocabularyEntities,
  }]);

  const actual = entityListContainerToDsvModel(
    "http://dcat-ap-cz/model", entityListContainer, context)

  // We need to update the expected state as inherited values
  // should not be preserved.
  expect(actual).toStrictEqual({
    iri: dsv.iri,
    externalDocumentationUrl: null,
    classProfiles: [{
      ...dsv.classProfiles[0],
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
    }, {
      ...dsv.classProfiles[1],
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
    }, {
      ...dsv.classProfiles[2],
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
    }],
    datatypePropertyProfiles: [],
    objectPropertyProfiles: [{
      ...dsv.objectPropertyProfiles[0],
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
    }],
  } satisfies ApplicationProfile);
});

test("Issue #1005", () => {

  const dsv: ApplicationProfile = {
    "iri": "http://dcat/model/",
    "externalDocumentationUrl": null,
    "classProfiles": [{
      "iri": "http://dcat/model/juicyBusiness",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "type": ["class-profile"],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/juicyBusiness"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/juicyBusiness"
      }],
      "profiledClassIri": ["http://dcat/model/juicyBusiness"],
      "specializationOfIri": [],
      "externalDocumentationUrl": "external-1",
      "classRole": ClassRole.supportive,
    }, {
      "iri": "http://dcat/model/bulkyForce",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "type": ["class-profile"],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/bulkyForce"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/bulkyForce"
      }],
      "profiledClassIri": ["http://dcat/model/bulkyForce"],
      "specializationOfIri": ["http://dcat/model/juicyBusiness"],
      "externalDocumentationUrl": "external-4",
      "classRole": ClassRole.undefined,
    }],
    "datatypePropertyProfiles": [],
    "objectPropertyProfiles": [{
      "iri": "http://dcat/model/BulkyForce.juicyWork",
      "cardinality": null,
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "profiledPropertyIri": ["http://dcat/model/juicyWork"],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/juicyWork"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/juicyWork"
      }
      ],
      "specializationOfIri": [],
      "type": ["object-property-profile"],
      "rangeClassIri": ["http://dcat/model/juicyBusiness"],
      "externalDocumentationUrl": "external-2",
      "requirementLevel": RequirementLevel.mandatory,
      "domainIri": "http://dcat/model/bulkyForce",
    }, {
      "iri": "http://dcat/model/JuicyBusiness.juicyWorkSpecial",
      "cardinality": null,
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "profiledPropertyIri": ["http://dcat/model/juicyWork"],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/juicyWork"
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/juicyWork"
      }],
      "specializationOfIri": ["http://dcat/model/BulkyForce.juicyWork"],
      "type": ["object-property-profile"],
      "rangeClassIri": ["http://dcat/model/juicyBusiness"],
      "externalDocumentationUrl": "external-3",
      "requirementLevel": RequirementLevel.recommended,
      "domainIri": "http://dcat/model/bulkyForce",
    }]
  };

  // Convert from DSV ConceptualModel to EntityListContainer with Entities.
  let counter = 0;
  const entityListContainer = conceptualModelToEntityListContainer(dsv, {
    generalizationIdentifier: () => `id-${++counter}`,
    iriToIdentifier: iri => iri,
  });

  // We need to add placeholder for a vocabulary, so we can properly
  // detect profiles or classes/relationships (from vocabulary) as
  // we need it to export to DSV properly. The reason is that DSV
  // utilize different predicate to profile profile or something
  // from a vocabulary.
  const vocabularyEntities: SemanticModelEntity[] = [{
    "id": "http://dcat/model/juicyBusiness",
    "iri": "http://dcat/model/juicyBusiness",
    "type": ["class"],
  }, {
    "id": "http://dcat/model/bulkyForce",
    "iri": "http://dcat/model/bulkyForce",
    "type": ["class"],
  }, {
    "id": "http://dcat/model/juicyWork",
    "iri": "http://dcat/model/juicyWork",
    "name": {},
    "description": {},
    "type": ["relationship"],
    "ends": [{
      "iri": null,
      "concept": null,
    }, {
      "iri": null,
      "concept": null,
    }],
  } as SemanticModelRelationship];

  // Convert from EntityListContainer with entities to ConceptualModel.
  const context = createContext([entityListContainer, {
    baseIri: "http://dcat/model/",
    entities: vocabularyEntities,
  }]);

  const actual = entityListContainerToDsvModel(
    "http://dcat/model/", entityListContainer, context)

  expect(actual).toStrictEqual(dsv);

});
