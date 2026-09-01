import { createDefaultSemanticModelBuilder } from "@dataspecer/semantic-model";
import { createDefaultProfileModelBuilder } from "@dataspecer/profile-model";
import {
    Cardinality,
    ClassRole,
    ApplicationProfile,
    RequirementLevel,
    ClassProfile,
} from "./dsv-model.ts";
import {
    createContext,
    entityListContainerToDsvModel,
} from "./entity-model-to-dsv.ts";
import { mergeEntityListContainers, toEntityListContainer } from "./entity-list-container-builder.ts";

test("Issue #608", () => {

    const vocabulary = createDefaultSemanticModelBuilder({
        baseIdentifier: "v#",
        baseIri: "http://dcat/model/",
    });
    const dataset = vocabulary.class({
        iri: "http://www.w3.org/ns/Dataset",
        name: { cs: "Datová sada", en: "Dataset" },
        description: {
            cs: "Kolekce dat, ke stažení.",
            en: "A collection of data, published or curated by a single agent, and available for access or download in one or more representations.",
        },
    });
    const title = dataset.property({
        iri: "http://purl.org/dc/terms/title",
        range: { identifier: "http://www.w3.org/2000/01/rdf-schema#Literal" },
    });

    const profile = createDefaultProfileModelBuilder({
        baseIdentifier: "p#",
        baseIri: "http://dcat/model/",
    });
    const datasetProfile = profile.class({
        iri: "http://www.w3.org/ns/Dataset-profile",
        // An own description value is set but ignored downstream, since
        // reuseDescription below makes descriptionFromProfiled take
        // precedence over it.
        description: { "": "ignore this" },
        usageNote: { "": "..." },
        externalDocumentationUrl: "http://documenation-1",
    })
        .reuseName(dataset)
        .reuseDescription(dataset);
    const titleProfile = profile.property({
        iri: "terms-title-profile",
        name: { en: "Dataset title" },
    })
        .domain(datasetProfile)
        .range("http://www.w3.org/2000/01/rdf-schema#Literal")
        .profile(title);
    // profile-model's builder doesn't yet forward `description`/
    // `externalDocumentationUrl` onto a property's range end (unlike
    // `.class()`); set them directly on the underlying entity.
    Object.assign((titleProfile as any).entity.ends[1], {
        description: { en: "A name given to the dataset." },
        externalDocumentationUrl: "http://documenation-2",
    });

    const container = mergeEntityListContainers(
        toEntityListContainer(vocabulary.build()),
        toEntityListContainer(profile.build()),
    );
    const context = createContext([container]);

    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", container, context);

    const expected: ApplicationProfile = {
        "iri": "http://dcat/model/",
        "externalDocumentationUrl": null,
        "classProfiles": [{
            "iri": "http://www.w3.org/ns/Dataset-profile",
            "prefLabel": {},
            "definition": {},
            "usageNote": { "": "..." },
            "profileOfIri": [],
            "reusesPropertyValue": [{
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://www.w3.org/ns/Dataset",
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://www.w3.org/ns/Dataset",
            }],
            "type": ["class-profile"],
            "profiledClassIri": ["http://www.w3.org/ns/Dataset"],
            "specializationOfIri": [],
            "classRole": ClassRole.undefined,
            "externalDocumentationUrl": "http://documenation-1",
        }],
        "datatypePropertyProfiles": [{
            "iri": "http://dcat/model/terms-title-profile",
            "cardinality": null,
            "prefLabel": { "en": "Dataset title" },
            "definition": { "en": "A name given to the dataset." },
            "usageNote": {},
            "profileOfIri": [],
            "profiledPropertyIri": ["http://purl.org/dc/terms/title"],
            "reusesPropertyValue": [],
            "type": ["datatype-property-profile"],
            "rangeDataTypeIri": [
                "http://www.w3.org/2000/01/rdf-schema#Literal"
            ],
            "specializationOfIri": [],
            "externalDocumentationUrl": "http://documenation-2",
            "requirementLevel": RequirementLevel.undefined,
            "domainIri": "http://www.w3.org/ns/Dataset-profile",
        }],
        "objectPropertyProfiles": []
    };

    expect(actual).toMatchObject(expected);
});

test("Issue #1005", () => {

    const vocabulary = createDefaultSemanticModelBuilder({
        baseIdentifier: "v#",
        baseIri: "http://dcat/model/",
    });
    const bulkyForce = vocabulary.class({ iri: "bulkyForce", name: { en: "Bulky Force" } });
    const juicyBusiness = vocabulary.class({ iri: "juicyBusiness", name: { en: "Juicy Business" } });
    const juicyWork = bulkyForce.property({
        iri: "juicyWork",
        name: { en: "Juicy Work" },
        range: juicyBusiness,
    });

    const profile = createDefaultProfileModelBuilder({
        baseIdentifier: "p#",
        baseIri: "http://dcat/model/",
    });
    const juicyBusinessProfile = profile.class({ iri: "juicyBusiness" })
        .reuseName(juicyBusiness)
        .reuseDescription(juicyBusiness);
    const bulkyForceProfile = profile.class({ iri: "bulkyForce" })
        .reuseName(bulkyForce)
        .reuseDescription(bulkyForce);
    // bulkyForceProfile specializes juicyBusinessProfile.
    profile.generalization(juicyBusinessProfile, bulkyForceProfile);

    const bulkyForceJuicyWork = profile.property({ iri: "BulkyForce.juicyWork" })
        .domain(bulkyForceProfile)
        .range(juicyBusinessProfile)
        .reuseName(juicyWork)
        .reuseDescription(juicyWork);
    const juicyBusinessJuicyWorkSpecial = profile.property({ iri: "JuicyBusiness.juicyWorkSpecial" })
        .domain(bulkyForceProfile)
        .range(juicyBusinessProfile)
        .reuseName(juicyWork)
        .reuseDescription(juicyWork);
    // juicyBusinessJuicyWorkSpecial specializes bulkyForceJuicyWork.
    profile.generalization(bulkyForceJuicyWork, juicyBusinessJuicyWorkSpecial);

    const container = mergeEntityListContainers(
        toEntityListContainer(vocabulary.build()),
        toEntityListContainer(profile.build()),
    );
    const context = createContext([container]);

    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", container, context);

    const expected: ApplicationProfile = {
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
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://dcat/model/juicyBusiness"
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://dcat/model/juicyBusiness"
            }],
            "profiledClassIri": ["http://dcat/model/juicyBusiness"],
            "specializationOfIri": [],
            "externalDocumentationUrl": null,
            "classRole": ClassRole.undefined,
        } as ClassProfile, {
            "iri": "http://dcat/model/bulkyForce",
            "prefLabel": {},
            "definition": {},
            "usageNote": {},
            "profileOfIri": [],
            "type": ["class-profile"],
            "reusesPropertyValue": [{
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://dcat/model/bulkyForce"
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://dcat/model/bulkyForce"
            }],
            "profiledClassIri": ["http://dcat/model/bulkyForce"],
            "specializationOfIri": ["http://dcat/model/juicyBusiness"],
            "externalDocumentationUrl": null,
            "classRole": ClassRole.undefined,
        } as ClassProfile],
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
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://dcat/model/juicyWork"
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://dcat/model/juicyWork"
            }
            ],
            "specializationOfIri": [],
            "type": ["object-property-profile"],
            "rangeClassIri": ["http://dcat/model/juicyBusiness"],
            "externalDocumentationUrl": null,
            "requirementLevel": RequirementLevel.undefined,
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
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://dcat/model/juicyWork"
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://dcat/model/juicyWork"
            }],
            "specializationOfIri": ["http://dcat/model/BulkyForce.juicyWork"],
            "type": ["object-property-profile"],
            "rangeClassIri": ["http://dcat/model/juicyBusiness"],
            "externalDocumentationUrl": null,
            "requirementLevel": RequirementLevel.undefined,
            "domainIri": "http://dcat/model/bulkyForce",
        }]
    };

    expect(actual).toMatchObject(expected);

});

test("Issue #1238 - export reusedAsProperty", () => {
    const vocabulary = createDefaultSemanticModelBuilder({
        baseIdentifier: "v#",
        baseIri: "https://mff-uk.github.io/specifications/dcat-dap#",
    });
    const dataset = vocabulary.class({
        iri: "http://www.w3.org/ns/dcat#Dataset",
        name: { en: "Dataset" },
        description: { en: "A collection of data" },
        nameProperty: "http://www.example.com/vocabulary#myNameProperty",
        descriptionProperty: "http://www.w3.org/vocabulary#myDescriptionProperty",
    });

    const profile = createDefaultProfileModelBuilder({
        baseIdentifier: "p#",
        baseIri: "https://mff-uk.github.io/specifications/dcat-dap#",
    });
    profile.class({
        iri: "Dataset",
        // Not part of SemanticModelClassProfile's own type (it's an
        // aggregator-only concept), but read by entity-model-to-dsv.ts
        // via a structural (nameProperty?) parameter - test default
        // (unset) behavior for descriptionProperty by leaving it out.
        nameProperty: "http://www.example.com/vocabulary#myOtherNameProperty",
    } as any)
        .reuseName(dataset)
        .reuseDescription(dataset);

    const container = mergeEntityListContainers(
        toEntityListContainer(vocabulary.build()),
        toEntityListContainer(profile.build()),
    );
    const context = createContext([container]);
    const actual = entityListContainerToDsvModel(
        "https://mff-uk.github.io/specifications/dcat-dap#",
        container,
        context,
    );

    expect(actual.classProfiles[0]?.reusesPropertyValue).toStrictEqual([
        {
            reusedPropertyIri: "http://www.example.com/vocabulary#myNameProperty",
            reusedAsPropertyIri: "http://www.example.com/vocabulary#myOtherNameProperty",
            propertyReusedFromResourceIri: "http://www.w3.org/ns/dcat#Dataset",
        },
        {
            reusedPropertyIri: "http://www.w3.org/vocabulary#myDescriptionProperty",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
            propertyReusedFromResourceIri: "http://www.w3.org/ns/dcat#Dataset",
        },
    ]);
});

test("Correct propagation of nameProperty and descriptionProperty.", () => {
    // dsv:reusedFromResource points to the actual reused resource, not necessarily the original vocabulary entity. So this might point to a profiled entity. You need to traverse the whole chain to get to the original vocabulary entity.
    // dsv:reusedProperty should be equal to dsv:reusedAsProperty of entity identified by dsv:reusedFromResource (in case we profile profile and not vocabulary). Since we do not allow to set your own dsv:reusedProperty, this implies that for any profile of profile, dsv:reusedProperty will always be skos:prefLabel, skos:definition and skos:scopeNote for title, description and usage note respectively.

    const vocabulary = createDefaultSemanticModelBuilder({
        baseIdentifier: "v#",
        baseIri: "http://example.com/",
    });
    const vocabularyClass = vocabulary.class({
        iri: "VocabularyClass",
        nameProperty: "http://example.com/vocabulary-name",
        descriptionProperty: "http://example.com/vocabulary-description",
    });
    const vocabularyProperty = vocabularyClass.property({
        iri: "vocabulary-property",
        range: { identifier: "http://www.w3.org/2000/01/rdf-schema#Literal" },
        nameProperty: "http://example.com/vocabulary-property-name",
        descriptionProperty: "http://example.com/vocabulary-property-description",
    });

    const profile = createDefaultProfileModelBuilder({
        baseIdentifier: "p#",
        baseIri: "http://example.com/",
    });
    const classProfile = profile.class({ iri: "ClassProfile" })
        .reuseName(vocabularyClass)
        .reuseDescription(vocabularyClass);
    profile.class({ iri: "ClassProfileOfProfile" })
        .reuseName(classProfile)
        .reuseDescription(classProfile);

    const propertyProfile = profile.property({ iri: "property-profile" })
        .domain(classProfile)
        .range("http://www.w3.org/2000/01/rdf-schema#Literal")
        .reuseName(vocabularyProperty)
        .reuseDescription(vocabularyProperty);
    profile.property({ iri: "property-profile-of-profile" })
        .domain(classProfile)
        .range("http://www.w3.org/2000/01/rdf-schema#Literal")
        .reuseName(propertyProfile)
        .reuseDescription(propertyProfile);

    const container = mergeEntityListContainers(
        toEntityListContainer(vocabulary.build()),
        toEntityListContainer(profile.build()),
    );
    const actual = entityListContainerToDsvModel(
        "http://example.com/",
        container,
        createContext([container]),
    );

    expect(actual.classProfiles).toMatchObject([{
        iri: "http://example.com/ClassProfile",
        profiledClassIri: ["http://example.com/VocabularyClass"],
        profileOfIri: [],
        reusesPropertyValue: [{
            reusedPropertyIri: "http://example.com/vocabulary-name",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
            propertyReusedFromResourceIri: "http://example.com/VocabularyClass",
        }, {
            reusedPropertyIri: "http://example.com/vocabulary-description",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
            propertyReusedFromResourceIri: "http://example.com/VocabularyClass",
        }],
    }, {
        iri: "http://example.com/ClassProfileOfProfile",
        profiledClassIri: [],
        profileOfIri: ["http://example.com/ClassProfile"],
        reusesPropertyValue: [{
            reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
            propertyReusedFromResourceIri: "http://example.com/ClassProfile",
        }, {
            reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
            propertyReusedFromResourceIri: "http://example.com/ClassProfile",
        }],
    }]);

    expect(actual.datatypePropertyProfiles).toMatchObject([{
        iri: "http://example.com/property-profile",
        profiledPropertyIri: ["http://example.com/vocabulary-property"],
        profileOfIri: [],
        reusesPropertyValue: [{
            reusedPropertyIri: "http://example.com/vocabulary-property-name",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
            propertyReusedFromResourceIri: "http://example.com/vocabulary-property",
        }, {
            reusedPropertyIri: "http://example.com/vocabulary-property-description",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
            propertyReusedFromResourceIri: "http://example.com/vocabulary-property",
        }],
    }, {
        iri: "http://example.com/property-profile-of-profile",
        profiledPropertyIri: [],
        profileOfIri: ["http://example.com/property-profile"],
        reusesPropertyValue: [{
            reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#prefLabel",
            propertyReusedFromResourceIri: "http://example.com/property-profile",
        }, {
            reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
            reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
            propertyReusedFromResourceIri: "http://example.com/property-profile",
        }],
    }]);

});

test("Ignores invalid or missing profileOf references, logging instead of throwing.", () => {

    const containers = [{
        "baseIri": "http://dcat/model/",
        "entities": [{
            "id": "c1",
            "iri": "c1",
            "type": ["class"],
            "name": {},
            "description": {},
        }, {
            "id": "r1",
            "iri": null,
            "type": ["relationship"],
            "name": {},
            "description": {},
            "ends": [{
                "concept": "c1",
                "name": {},
                "description": {},
            }, {
                "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
                "iri": "attribute",
                "name": {},
                "description": {},
            }],
        }, {
            // Profiles a missing entity and an entity of the wrong type
            // (a relationship, not a class/class-profile).
            "id": "badClassProfile",
            "iri": "badClassProfile",
            "type": ["class-profile"],
            "profiling": ["missing-id", "r1"],
            "name": {},
            "nameFromProfiled": null,
            "description": {},
            "descriptionFromProfiled": null,
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "tags": [],
        }, {
            // Profiles a missing entity and an entity of the wrong type
            // (a class, not a relationship/relationship-profile).
            "id": "badPropertyProfile",
            "type": ["relationship-profile"],
            "ends": [{
                "concept": "c1",
                "name": {},
                "description": {},
                "usageNote": {},
            }, {
                "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
                "iri": "bad-attribute",
                "cardinality": null,
                "profiling": ["missing-id", "c1"],
                "name": {},
                "nameFromProfiled": null,
                "description": {},
                "descriptionFromProfiled": null,
                "usageNote": {},
                "usageNoteFromProfiled": null,
            }],
        }],
    }] as any;

    const context = createContext(containers);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

    expect(actual.classProfiles[0]?.profiledClassIri).toStrictEqual([]);
    expect(actual.classProfiles[0]?.profileOfIri).toStrictEqual([]);
    expect(actual.datatypePropertyProfiles[0]?.profiledPropertyIri).toStrictEqual([]);
    expect(actual.datatypePropertyProfiles[0]?.profileOfIri).toStrictEqual([]);
});

test("Falls back to the raw identifier when a generalization's parent is unresolved.", () => {

    const containers = [{
        "baseIri": "http://dcat/model/",
        "entities": [{
            "id": "c1",
            "iri": "c1",
            "type": ["class-profile"],
            "profiling": [],
            "name": {},
            "nameFromProfiled": null,
            "description": {},
            "descriptionFromProfiled": null,
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "tags": [],
        }, {
            "id": "gen",
            "iri": null,
            "type": ["generalization"],
            "child": "c1",
            "parent": "missing-parent-id",
        }],
    }] as any;

    const context = createContext(containers);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

    expect(actual.classProfiles[0]?.specializationOfIri).toStrictEqual(["missing-parent-id"]);
});

test("Skips relationship profiles with missing ends, a missing domain concept, or a null range concept.", () => {

    const containers = [{
        "baseIri": "http://dcat/model/",
        "entities": [{
            "id": "c1",
            "iri": "c1",
            "type": ["class"],
            "name": {},
            "description": {},
        }, {
            // Missing both ends entirely.
            "id": "missingEnds",
            "type": ["relationship-profile"],
            "ends": [],
        }, {
            // Missing the domain concept (ends[0].concept).
            "id": "missingDomain",
            "type": ["relationship-profile"],
            "ends": [{
                "concept": null,
                "name": {},
                "description": {},
                "usageNote": {},
            }, {
                "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
                "iri": "missingDomain-attribute",
                "name": {},
                "description": {},
                "usageNote": {},
                "profiling": [],
            }],
        }, {
            // Null range concept.
            "id": "nullRange",
            "type": ["relationship-profile"],
            "ends": [{
                "concept": "c1",
                "name": {},
                "description": {},
                "usageNote": {},
            }, {
                "concept": null,
                "iri": "nullRange-attribute",
                "cardinality": null,
                "name": {},
                "description": {},
                "usageNote": {},
                "profiling": [],
            }],
        }],
    }] as any;

    const context = createContext(containers);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

    expect(actual.datatypePropertyProfiles).toStrictEqual([]);
    expect(actual.objectPropertyProfiles).toStrictEqual([]);
});

test("Maps every [start, end] cardinality tuple to the matching Cardinality enum value.", () => {

    const combinations: { start: number, end: number | null, expected: Cardinality }[] = [
        { start: 0, end: 0, expected: Cardinality.ZeroToZero },
        { start: 0, end: 1, expected: Cardinality.ZeroToOne },
        { start: 0, end: null, expected: Cardinality.ZeroToMany },
        { start: 1, end: 0, expected: Cardinality.OneToZero },
        { start: 1, end: 1, expected: Cardinality.OneToOne },
        { start: 1, end: null, expected: Cardinality.OneToMany },
        { start: 2, end: 0, expected: Cardinality.ManyToZero },
        { start: 2, end: 1, expected: Cardinality.ManyToOne },
        { start: 2, end: null, expected: Cardinality.ManyToMany },
    ];

    const vocabulary = createDefaultSemanticModelBuilder({
        baseIdentifier: "v#",
        baseIri: "http://dcat/model/",
    });
    const c1 = vocabulary.class({ iri: "c1" });

    const profile = createDefaultProfileModelBuilder({
        baseIdentifier: "p#",
        baseIri: "http://dcat/model/",
    });
    combinations.forEach(({ start, end }, index) => {
        profile.property({ iri: `property-${index}`, cardinality: [start, end] })
            // .domain() is typed for a ProfileClassBuilder, but the domain
            // here is a plain vocabulary class, which is a valid (if
            // unusual) EntityListContainer shape.
            .domain(c1 as any)
            .range("http://www.w3.org/2000/01/rdf-schema#Literal");
    });

    const container = mergeEntityListContainers(
        toEntityListContainer(vocabulary.build()),
        toEntityListContainer(profile.build()),
    );
    const context = createContext([container]);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", container, context);

    expect(actual.datatypePropertyProfiles.map(item => item.cardinality)).toStrictEqual(
        combinations.map(item => item.expected));
});

test("Resolves getPropertyForName/getPropertyForDescription cycles and unrecognized entity types to null.", () => {

    const containers = [{
        "baseIri": "http://dcat/model/",
        "entities": [{
            // Not a class, relationship, or profile - falls through to the
            // final "unrecognized type" branch.
            "id": "gen1",
            "iri": null,
            "type": ["generalization"],
            "child": "does-not-matter",
            "parent": "does-not-matter",
        }, {
            // Self-referencing profile: name/description resolution must
            // detect the cycle and stop instead of looping forever.
            "id": "cyclic",
            "iri": "cyclic",
            "type": ["class-profile"],
            // A missing profiling entry (null) exercises the identifierToEntity
            // "iri === null" branch.
            "profiling": [null, "gen1"],
            "name": null,
            "nameFromProfiled": "cyclic",
            "description": null,
            "descriptionFromProfiled": "cyclic",
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "tags": [],
        }, {
            // Profiles an entity of an unrecognized type.
            "id": "unknownType",
            "iri": "unknownType",
            "type": ["class-profile"],
            "profiling": [],
            "name": null,
            "nameFromProfiled": "gen1",
            "description": null,
            "descriptionFromProfiled": "gen1",
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "tags": [],
        }],
    }] as any;

    const context = createContext(containers);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

    // Cycle and unrecognized type both fall back to the SKOS default,
    // reusing the value from the profile chain's own (empty) name/description.
    expect(actual.classProfiles[0]?.reusesPropertyValue).toStrictEqual([{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/cyclic",
    }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/cyclic",
    }]);
    expect(actual.classProfiles[1]?.reusesPropertyValue).toStrictEqual([{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/gen1",
    }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/gen1",
    }]);
});

test("Resolves a relative IRI against an empty string when the container has no baseIri.", () => {

    const profile = createDefaultProfileModelBuilder({
        baseIdentifier: "p#",
        baseIri: null,
    });
    profile.class({ iri: "relativeClass" });

    const container = toEntityListContainer(profile.build());
    const context = createContext([container]);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", container, context);

    expect(actual.classProfiles[0]?.iri).toBe("relativeClass");
});
