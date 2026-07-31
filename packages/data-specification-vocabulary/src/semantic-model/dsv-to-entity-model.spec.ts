import { SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { SemanticModelClassProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { Cardinality, ApplicationProfile, RequirementLevel } from "./dsv-model.ts";
import { createDefaultApplicationProfileBuilder } from "./default-dsv-model-builder.ts";
import { conceptualModelToEntityListContainer } from "./dsv-to-entity-model.ts";
import { EntityListContainer } from "./entity-model.ts";
import { entityListContainerToDsvModel, createContext } from "./entity-model-to-dsv.ts";
import { toEntityListContainer } from "./entity-list-container-builder.ts";
import { DSV_CLASS_ROLE, DSV_MANDATORY_LEVEL, SKOS } from "./vocabulary.ts";

test("From DSV to entity model and back.", async () => {

  const builder = createDefaultApplicationProfileBuilder({ iri: "http://dcat-ap-cz/model" });
  const datasetProfile = builder.classProfile({ // dcat-ap-0001
    iri: "https://dcat-ap/#Dataset",
    externalDocumentationUrl: "external-1",
  })
    .profilesClass("http://www.w3.org/ns/dcat#Dataset")
    .reuses({ property: SKOS.scopeNote.id, from: "http://www.w3.org/ns/dcat#Dataset" })
    .main();
  builder.classProfile({ // dcat-ap-0002
    iri: "https://dcat-ap-cz/#Dataset",
    externalDocumentationUrl: "external-2",
  })
    .profileOf(datasetProfile)
    .supportive();
  const distributionProfile = builder.classProfile({ // dcat-ap-0003
    iri: "http://dcat-ap/ns/dcat#Distribution",
    externalDocumentationUrl: "external-3",
  })
    .profilesClass("http://www.w3.org/ns/dcat#Distribution");
  builder.objectProperty({ // dcat-ap-0005
    iri: "http://www.w3.org/ns/dcat#distribution-profile",
    cardinality: Cardinality.ZeroToMany,
    externalDocumentationUrl: "external-5",
    requirementLevel: RequirementLevel.optional,
  })
    .domain(datasetProfile)
    .range(distributionProfile)
    .profilesProperty("http://www.w3.org/ns/dcat#distribution");

  const dsv = builder.build();

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
      controlledVocabularies: [],
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

  expect(entityListContainer).toMatchObject(expectedEntityListContainer);

  // We need to add placeholder for a vocabulary, so we can properly
  // detect profiles or classes/relationships (from vocabulary) as
  // we need it to export to DSV properly. The reason is that DSV
  // utilize different predicate to profile profile or something
  // from a vocabulary. Ids are set explicitly to match the IRIs
  // used above, since iriToIdentifier maps vocabulary IRIs to themselves.
  const vocabularyModel = createDefaultSemanticModelBuilder({
    baseIdentifier: "",
    baseIri: "http://dcat-ap-cz/model",
  });
  vocabularyModel.class({
    id: "http://www.w3.org/ns/dcat#Dataset", iri: "http://www.w3.org/ns/dcat#Dataset",
  });
  vocabularyModel.class({
    id: "http://www.w3.org/ns/dcat#Distribution", iri: "http://www.w3.org/ns/dcat#Distribution",
  });
  vocabularyModel.property({
    id: "http://www.w3.org/ns/dcat#distribution", iri: "http://www.w3.org/ns/dcat#distribution",
  });

  // Convert from EntityListContainer with entities to ConceptualModel.
  const context = createContext([
    entityListContainer, toEntityListContainer(vocabularyModel.build()),
  ]);

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

  const builder = createDefaultApplicationProfileBuilder({ iri: "http://dcat/model/" });
  const juicyBusinessProfile = builder.classProfile({
    iri: "http://dcat/model/juicyBusiness",
    externalDocumentationUrl: "external-1",
  })
    .profilesClass("http://dcat/model/juicyBusiness")
    .reusesNameAndDescription("http://dcat/model/juicyBusiness")
    .supportive();
  const bulkyForceProfile = builder.classProfile({
    iri: "http://dcat/model/bulkyForce",
    externalDocumentationUrl: "external-4",
  })
    .profilesClass("http://dcat/model/bulkyForce")
    .reusesNameAndDescription("http://dcat/model/bulkyForce")
    .specializes(juicyBusinessProfile);

  const bulkyForceJuicyWork = builder.objectProperty({
    iri: "http://dcat/model/BulkyForce.juicyWork",
    externalDocumentationUrl: "external-2",
    requirementLevel: RequirementLevel.mandatory,
  })
    .domain(bulkyForceProfile)
    .range(juicyBusinessProfile)
    .profilesProperty("http://dcat/model/juicyWork")
    .reusesNameAndDescription("http://dcat/model/juicyWork");
  builder.objectProperty({
    iri: "http://dcat/model/JuicyBusiness.juicyWorkSpecial",
    externalDocumentationUrl: "external-3",
    requirementLevel: RequirementLevel.recommended,
  })
    .domain(bulkyForceProfile)
    .range(juicyBusinessProfile)
    .profilesProperty("http://dcat/model/juicyWork")
    .reusesNameAndDescription("http://dcat/model/juicyWork")
    .specializes(bulkyForceJuicyWork);

  const dsv = builder.build();

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
  // from a vocabulary. Ids are set explicitly to match the IRIs used
  // above, since iriToIdentifier maps vocabulary IRIs to themselves.
  const vocabularyModel = createDefaultSemanticModelBuilder({
    baseIdentifier: "",
    baseIri: "http://dcat/model/",
  });
  vocabularyModel.class({ id: "http://dcat/model/juicyBusiness", iri: "http://dcat/model/juicyBusiness" });
  vocabularyModel.class({ id: "http://dcat/model/bulkyForce", iri: "http://dcat/model/bulkyForce" });
  vocabularyModel.property({ id: "http://dcat/model/juicyWork", iri: "http://dcat/model/juicyWork" });

  // Convert from EntityListContainer with entities to ConceptualModel.
  const context = createContext([
    entityListContainer, toEntityListContainer(vocabularyModel.build()),
  ]);

  const actual = entityListContainerToDsvModel(
    "http://dcat/model/", entityListContainer, context)

  expect(actual).toMatchObject(dsv);

});

test("Uses the default generalizationIdentifier when none is provided.", () => {

  const builder = createDefaultApplicationProfileBuilder({ iri: "http://dcat/model/" });
  const parent = builder.classProfile({ iri: "http://dcat/model/parent" });
  builder.classProfile({ iri: "http://dcat/model/child" }).specializes(parent);
  const dsv = builder.build();

  const actual = conceptualModelToEntityListContainer(dsv, {
    iriToIdentifier: iri => iri,
  });

  const generalization = actual.entities.find(
    item => item.type.includes("generalization"));
  expect(generalization).toMatchObject({
    id: "https://dataspecer.com/semantic-models/generalization?"
      + "fromIri=http://dcat/model/child&toIri=http://dcat/model/parent",
    child: "http://dcat/model/child",
    parent: "http://dcat/model/parent",
  });
});

test("Warns and keeps the first candidate when multiple reuse entries target the same property.", () => {

  const builder = createDefaultApplicationProfileBuilder({ iri: "http://dcat/model/" });
  builder.classProfile({ iri: "http://dcat/model/duplicate" })
    .reuses({ property: SKOS.prefLabel.id, from: "http://dcat/model/first" })
    .reuses({ property: SKOS.prefLabel.id, from: "http://dcat/model/second" });
  const dsv = builder.build();

  const actual = conceptualModelToEntityListContainer(dsv, {
    generalizationIdentifier: () => "gen",
    iriToIdentifier: iri => iri,
  });

  expect(actual.entities[0]).toMatchObject({
    nameFromProfiled: "http://dcat/model/first",
  });
});

test("Skips property profiles with an unresolved or invalid range.", () => {

  const builder = createDefaultApplicationProfileBuilder({ iri: "http://dcat/model/" });
  // Datatype property with no range data type - should be skipped.
  builder.datatypeProperty({
    iri: "http://dcat/model/missingDatatypeRange", domainIri: "http://dcat/model/domain",
  });
  // Object property with no range class - should be skipped.
  builder.objectProperty({
    iri: "http://dcat/model/missingObjectRange", domainIri: "http://dcat/model/domain",
  });

  const dsv = builder.build();
  // Neither datatype nor object property - should be skipped. The builder's
  // typed API can't produce an invalid type, so start from a valid profile
  // (built via a throwaway builder) and override it.
  dsv.objectPropertyProfiles.push({
    ...createDefaultApplicationProfileBuilder({ iri: "http://dcat/model/" })
      .objectProperty({ iri: "http://dcat/model/invalidType", domainIri: "http://dcat/model/domain" })
      .build(),
    type: ["something-else"],
  } as any);

  const actual = conceptualModelToEntityListContainer(dsv, {
    generalizationIdentifier: () => "gen",
    iriToIdentifier: iri => iri,
  });

  expect(actual.entities).toStrictEqual([]);
});

test("Maps every Cardinality enum value to the matching [start, end] tuple.", () => {

  const combinations: { cardinality: Cardinality, expected: [number, number | null] }[] = [
    { cardinality: Cardinality.ZeroToZero, expected: [0, 0] },
    { cardinality: Cardinality.ZeroToOne, expected: [0, 1] },
    { cardinality: Cardinality.ZeroToMany, expected: [0, null] },
    { cardinality: Cardinality.OneToZero, expected: [1, 0] },
    { cardinality: Cardinality.OneToOne, expected: [1, 1] },
    { cardinality: Cardinality.OneToMany, expected: [1, null] },
    { cardinality: Cardinality.ManyToZero, expected: [2, 0] },
    { cardinality: Cardinality.ManyToOne, expected: [2, 1] },
    { cardinality: Cardinality.ManyToMany, expected: [2, 0] },
  ];

  const builder = createDefaultApplicationProfileBuilder({ iri: "http://dcat/model/" });
  combinations.forEach(({ cardinality }, index) => {
    builder.objectProperty({
      iri: `http://dcat/model/property-${index}`,
      domainIri: "http://dcat/model/domain",
      cardinality,
      rangeClassIri: ["http://dcat/model/range"],
    });
  });
  const dsv = builder.build();

  const actual = conceptualModelToEntityListContainer(dsv, {
    generalizationIdentifier: () => "gen",
    iriToIdentifier: iri => iri,
  });

  const relationshipProfiles = actual.entities.filter(
    item => item.type.includes("relationship-profile")) as SemanticModelRelationshipProfile[];

  expect(relationshipProfiles.map(item => item.ends[1]?.cardinality)).toStrictEqual(
    combinations.map(item => item.expected));
});

test("Falls back to {} for a null prefLabel/definition/usageNote, and matches reuse by reusedPropertyIri when reusedAsPropertyIri is missing.", () => {

  const builder = createDefaultApplicationProfileBuilder({ iri: "http://dcat/model/" });
  const dsv: ApplicationProfile = {
    "iri": "http://dcat/model/",
    "externalDocumentationUrl": null,
    "classProfiles": [{
      ...builder.classProfile({ iri: "http://dcat/model/class" }).build(),
      "prefLabel": null,
      "definition": null,
      "usageNote": null,
    } as any],
    "datatypePropertyProfiles": [],
    "objectPropertyProfiles": [{
      ...builder.objectProperty({
        iri: "http://dcat/model/property",
        domainIri: "http://dcat/model/domain",
        rangeClassIri: ["http://dcat/model/range"],
      }).build(),
      "prefLabel": null,
      "definition": null,
      "usageNote": null,
      "reusesPropertyValue": [{
        "reusedPropertyIri": SKOS.prefLabel.id,
        "reusedAsPropertyIri": undefined,
        "propertyReusedFromResourceIri": "http://dcat/model/source",
      } as any],
    } as any],
  };

  const actual = conceptualModelToEntityListContainer(dsv, {
    generalizationIdentifier: () => "gen",
    iriToIdentifier: iri => iri,
  });

  const [classEntity, relationshipEntity] = actual.entities as [
    SemanticModelClassProfile, SemanticModelRelationshipProfile,
  ];
  expect(classEntity.name).toStrictEqual({});
  expect(classEntity.description).toStrictEqual({});
  expect(classEntity.usageNote).toStrictEqual({});

  const range = relationshipEntity.ends[1]!;
  expect(range.name).toStrictEqual({});
  expect(range.description).toStrictEqual({});
  expect(range.usageNote).toStrictEqual({});
  // Falls back to matching by reusedPropertyIri since reusedAsPropertyIri
  // is missing on the reuse entry.
  expect(range.nameFromProfiled).toBe("http://dcat/model/source");
});
