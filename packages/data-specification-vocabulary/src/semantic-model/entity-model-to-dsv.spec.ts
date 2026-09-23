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
import { EntityListContainer } from "./entity-model.ts";
import { CONTROLLED_VOCABULARY_ASSIGNMENT } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { CONTROLLED_VOCABULARY_TYPE, controlledVocabularyDatasetIri } from "@dataspecer/controlled-vocabulary-model";

/**
 * The profile-model builder used elsewhere in this file has no support
 * for controlled vocabularies or their assignments, so these two are
 * built by hand and merged into a builder-produced container instead.
 * TODO: use builder after support for CVs is added
 */
const CONTROLLED_VOCABULARY = {
    id: "voc-1", type: [CONTROLLED_VOCABULARY_TYPE],
    title: "Test Vocab", pattern: "", references: "http://vocab.example.com/scheme",
    documentation: "", distribution: { downloadUrl: "", accessUrl: "" }, iri: null,
} as any;

const CV_CATALOG_IRI = "http://example.com/catalog";

function controlledVocabularyAssignmentEntity(overrides: Record<string, unknown>) {
    return {
        id: "cv-1", type: [CONTROLLED_VOCABULARY_ASSIGNMENT],
        classProfile: "class-1", vocabulary: "voc-1", qualifier: "MUST",
        replaces: null, iri: null,
        ...overrides,
    } as any;
}

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
            "controlledVocabularyAssignments": [],
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
            "controlledVocabularyAssignments": [],
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
            "controlledVocabularyAssignments": [],
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

test("Resolves reused name/description property through a chain of class and relationship profiles.", () => {

    const vocabulary = createDefaultSemanticModelBuilder({
        baseIdentifier: "v#",
        baseIri: "http://dcat/model/",
    });
    const c1 = vocabulary.class({
        iri: "c1",
        nameProperty: "ex:nameProp",
        descriptionProperty: "ex:descProp",
    });
    const r1 = c1.property({
        iri: "attribute",
        range: { identifier: "http://www.w3.org/2000/01/rdf-schema#Literal" },
        nameProperty: "ex:relNameProp",
        descriptionProperty: "ex:relDescProp",
    });

    const profile = createDefaultProfileModelBuilder({
        baseIdentifier: "p#",
        baseIri: "http://dcat/model/",
    });
    const p1 = profile.class({ iri: "p1" })
        .reuseName(c1)
        .reuseDescription(c1);
    // nameProperty/descriptionProperty aren't part of SemanticModelClassProfile
    // itself (aggregator-only concept), hence the cast.
    const p2 = profile.class({
        iri: "p2",
        nameProperty: "ex:overrideName",
        descriptionProperty: "ex:overrideDesc",
    } as any)
        .reuseName(p1)
        .reuseDescription(p1);

    const rp1 = profile.property({ iri: "attribute-p1" })
        .domain(p1)
        .range("http://www.w3.org/2000/01/rdf-schema#Literal")
        .reuseName(r1)
        .reuseDescription(r1);
    const rp2 = profile.property({ iri: "attribute-p2" })
        .domain(p2)
        .range("http://www.w3.org/2000/01/rdf-schema#Literal")
        .reuseName(rp1)
        .reuseDescription(rp1);
    // profile-model's builder doesn't yet forward nameProperty/
    // descriptionProperty onto a property's range end; set the override
    // directly on the underlying entity.
    Object.assign((rp2 as any).entity.ends[1], {
        nameProperty: "ex:overrideRelName",
        descriptionProperty: "ex:overrideRelDesc",
    });

    const container = mergeEntityListContainers(
        toEntityListContainer(vocabulary.build()),
        toEntityListContainer(profile.build()),
    );
    const context = createContext([container]);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", container, context);

    // Class profile one level from the vocabulary class.
    expect(actual.classProfiles[0]?.reusesPropertyValue).toStrictEqual([{
        "reusedPropertyIri": "ex:nameProp",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/c1",
    }, {
        "reusedPropertyIri": "ex:descProp",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/c1",
    }]);

    // Class profile two levels away, through another class profile.
    expect(actual.classProfiles[1]?.reusesPropertyValue).toStrictEqual([{
        "reusedPropertyIri": "ex:nameProp",
        "reusedAsPropertyIri": "ex:overrideName",
        "propertyReusedFromResourceIri": "http://dcat/model/p1",
    }, {
        "reusedPropertyIri": "ex:descProp",
        "reusedAsPropertyIri": "ex:overrideDesc",
        "propertyReusedFromResourceIri": "http://dcat/model/p1",
    }]);

    // Property profile one level from the vocabulary relationship.
    expect(actual.datatypePropertyProfiles[0]?.reusesPropertyValue).toStrictEqual([{
        "reusedPropertyIri": "ex:relNameProp",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat/model/attribute",
    }, {
        "reusedPropertyIri": "ex:relDescProp",
        "reusedAsPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
        "propertyReusedFromResourceIri": "http://dcat/model/attribute",
    }]);

    // Property profile two levels away, through another property profile.
    expect(actual.datatypePropertyProfiles[1]?.reusesPropertyValue).toStrictEqual([{
        "reusedPropertyIri": "ex:relNameProp",
        "reusedAsPropertyIri": "ex:overrideRelName",
        "propertyReusedFromResourceIri": "http://dcat/model/attribute-p1",
    }, {
        "reusedPropertyIri": "ex:relDescProp",
        "reusedAsPropertyIri": "ex:overrideRelDesc",
        "propertyReusedFromResourceIri": "http://dcat/model/attribute-p1",
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

test("Controlled vocabulary assignment: no stored assignment iri, generated iri references the vocabulary's dataset iri.", () => {
    const profile = createDefaultProfileModelBuilder({ baseIdentifier: "p#", baseIri: null });
    profile.class({ id: "class-1", iri: "http://example.com/class-1", controlledVocabularies: ["cv-1"] });
    const container = mergeEntityListContainers(
        toEntityListContainer(profile.build()),
        { baseIri: null, entities: [CONTROLLED_VOCABULARY, controlledVocabularyAssignmentEntity({})] },
    );

    const context = createContext([container], new Map([[CONTROLLED_VOCABULARY.id, CV_CATALOG_IRI]]));
    const actual = entityListContainerToDsvModel("http://example.com/", container, context);

    const assignments = actual.classProfiles[0]!.controlledVocabularyAssignments;
    expect(assignments).toHaveLength(1);
    expect(assignments[0]!.controlledVocabularyIri).toBe(controlledVocabularyDatasetIri(CV_CATALOG_IRI, CONTROLLED_VOCABULARY.id));
    expect(assignments[0]!.usageExpectationIri).toContain("must");
    expect(assignments[0]!.replacesIri).toBeNull();
    expect(assignments[0]!.iri).toContain("http://example.com/class-1/controlled-vocabulary-assignment");
});

test("Controlled vocabulary assignment: a stored iri is reused verbatim.", () => {
    const profile = createDefaultProfileModelBuilder({ baseIdentifier: "p#", baseIri: null });
    profile.class({ id: "class-1", iri: "http://example.com/class-1", controlledVocabularies: ["cv-1"] });
    const container = mergeEntityListContainers(
        toEntityListContainer(profile.build()),
        {
            baseIri: null,
            entities: [
                CONTROLLED_VOCABULARY,
                controlledVocabularyAssignmentEntity({ iri: "http://stored.example.com/my-iri" }),
            ],
        },
    );

    const context = createContext([container]);
    const actual = entityListContainerToDsvModel("http://example.com/", container, context);

    expect(actual.classProfiles[0]!.controlledVocabularyAssignments[0]!.iri)
        .toBe("http://stored.example.com/my-iri");
});

test("Controlled vocabulary assignment: a local replaces resolves to the target's iri, even across a different class profile.", () => {
    const profile = createDefaultProfileModelBuilder({ baseIdentifier: "p#", baseIri: null });
    const ancestor = profile.class({ id: "ancestor", iri: "http://example.com/ancestor", controlledVocabularies: ["cv-ancestor"] });
    profile.class({ id: "child", iri: "http://example.com/child", controlledVocabularies: ["cv-child"] })
        .profile(ancestor);
    const container = mergeEntityListContainers(
        toEntityListContainer(profile.build()),
        {
            baseIri: null,
            entities: [
                CONTROLLED_VOCABULARY,
                controlledVocabularyAssignmentEntity({
                    id: "cv-ancestor", classProfile: "ancestor", qualifier: "RECOMMENDED",
                }),
                controlledVocabularyAssignmentEntity({
                    id: "cv-child", classProfile: "child", qualifier: "MUST",
                    replaces: { kind: "local", target: "cv-ancestor" },
                }),
            ],
        },
    );

    const context = createContext([container]);
    const actual = entityListContainerToDsvModel("http://example.com/", container, context);

    const child = actual.classProfiles.find(item => item.iri === "http://example.com/child")!;
    expect(child.controlledVocabularyAssignments[0]!.replacesIri)
        .toContain("http://example.com/ancestor/controlled-vocabulary-assignment");
});

test("Controlled vocabulary assignment: an imported replaces passes through unresolved.", () => {
    const profile = createDefaultProfileModelBuilder({ baseIdentifier: "p#", baseIri: null });
    profile.class({ id: "class-1", iri: "http://example.com/class-1", controlledVocabularies: ["cv-1"] });
    const container = mergeEntityListContainers(
        toEntityListContainer(profile.build()),
        {
            baseIri: null,
            entities: [
                CONTROLLED_VOCABULARY,
                controlledVocabularyAssignmentEntity({
                    replaces: { kind: "imported", iri: "http://foreign.example.com/some-assignment" },
                }),
            ],
        },
    );

    const context = createContext([container]);
    const actual = entityListContainerToDsvModel("http://example.com/", container, context);

    expect(actual.classProfiles[0]!.controlledVocabularyAssignments[0]!.replacesIri)
        .toBe("http://foreign.example.com/some-assignment");
});

test("Controlled vocabulary assignment: a dangling local replaces target degrades to null.", () => {
    const profile = createDefaultProfileModelBuilder({ baseIdentifier: "p#", baseIri: null });
    profile.class({ id: "class-1", iri: "http://example.com/class-1", controlledVocabularies: ["cv-1"] });
    const container = mergeEntityListContainers(
        toEntityListContainer(profile.build()),
        {
            baseIri: null,
            entities: [
                controlledVocabularyAssignmentEntity({
                    vocabulary: "voc-missing",
                    replaces: { kind: "local", target: "does-not-exist" },
                }),
            ],
        },
    );

    const context = createContext([container]);
    const actual = entityListContainerToDsvModel("http://example.com/", container, context);

    const assignment = actual.classProfiles[0]!.controlledVocabularyAssignments[0]!;
    expect(assignment.replacesIri).toBeNull();
    // Vocabulary entity missing from the container - degrades to the raw id.
    expect(assignment.controlledVocabularyIri).toBe("voc-missing");
});

test("Controlled vocabulary assignment: an id that does not resolve to an assignment entity is skipped.", () => {
    const profile = createDefaultProfileModelBuilder({ baseIdentifier: "p#", baseIri: null });
    profile.class({ id: "class-1", iri: "http://example.com/class-1", controlledVocabularies: ["does-not-exist"] });
    const container = toEntityListContainer(profile.build());

    const context = createContext([container]);
    const actual = entityListContainerToDsvModel("http://example.com/", container, context);

    expect(actual.classProfiles[0]!.controlledVocabularyAssignments).toStrictEqual([]);
});

test("entityToIri mints a ControlledVocabulary's dataset iri, scoped to the catalog it is a member of - not its references field.", () => {
    const container: EntityListContainer = { baseIri: null, entities: [CONTROLLED_VOCABULARY] };
    const context = createContext([container], new Map([[CONTROLLED_VOCABULARY.id, CV_CATALOG_IRI]]));

    const iri = context.entityToIri(container.entities[0]!);
    expect(iri).toBe(controlledVocabularyDatasetIri(CV_CATALOG_IRI, CONTROLLED_VOCABULARY.id));
    expect(iri).not.toBe(CONTROLLED_VOCABULARY.references);
});

test("entityToIri reuses a ControlledVocabulary's own stored iri instead of minting one, even when a catalog iri is available.", () => {
    const imported = { ...CONTROLLED_VOCABULARY, iri: "http://other-catalog.example.com/dataset/imported-cv" };
    const container: EntityListContainer = { baseIri: null, entities: [imported] };
    const context = createContext([container], new Map([[imported.id, CV_CATALOG_IRI]]));

    expect(context.entityToIri(container.entities[0]!)).toBe(imported.iri);
});

test("entityToIri resolves a ControlledVocabulary owned by one package's catalog even when referenced from a different container's profile.", () => {
    const nestedCatalogIri = "http://nested.example.com/catalog";
    const cvContainer: EntityListContainer = { baseIri: "http://nested.example.com/", entities: [CONTROLLED_VOCABULARY] };

    const profile = createDefaultProfileModelBuilder({ baseIdentifier: "p#", baseIri: "http://top-level.example.com/" });
    profile.class({ id: "class-1", iri: "http://top-level.example.com/class-1", controlledVocabularies: ["cv-1"] });
    const profileContainer = mergeEntityListContainers(
        toEntityListContainer(profile.build()),
        { baseIri: "http://top-level.example.com/", entities: [controlledVocabularyAssignmentEntity({})] },
    );

    // The CV is owned by (and its dataset iri scoped to) the nested package's
    // own catalog - distinct from the top-level profile's own catalog -
    // demonstrating that a reference crossing this boundary stays correct
    // regardless of which container is doing the referencing.
    const context = createContext(
        [cvContainer, profileContainer],
        new Map([[CONTROLLED_VOCABULARY.id, nestedCatalogIri]]),
    );
    const actual = entityListContainerToDsvModel("http://top-level.example.com/", profileContainer, context);

    expect(actual.classProfiles[0]!.controlledVocabularyAssignments[0]!.controlledVocabularyIri)
        .toBe(controlledVocabularyDatasetIri(nestedCatalogIri, CONTROLLED_VOCABULARY.id));
});
