import {
    SemanticModelClass,
    SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import {
    SemanticModelClassProfile,
    SemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import {
    Cardinality,
    ClassRole,
    ApplicationProfile,
    PropertyProfile,
    RequirementLevel,
    ClassProfile,
} from "./dsv-model.ts";
import { EntityListContainer } from "./entity-model.ts";
import {
    createContext,
    entityListContainerToDsvModel,
} from "./entity-model-to-dsv.ts";

test("Issue #608", () => {

    const containers = [{
        "baseIri": "http://dcat/model/",
        "entities": [{
            "id": "hslnicx7yaely6tdyht",
            "profiling": ["http://www.w3.org/ns/Dataset"],
            "type": ["class-profile"],
            "iri": "http://www.w3.org/ns/Dataset-profile",
            "name": null,
            "nameFromProfiled": "http://www.w3.org/ns/Dataset",
            "description": null,
            "descriptionFromProfiled": "http://www.w3.org/ns/Dataset",
            "usageNote": {},
            "usageNoteFromProfiled": null,
        } as SemanticModelClassProfile, {
            "usageNote": {},
            "id": "3sww3fqegbxly6tk8z3",
            "type": ["relationship-profile"],
            "ends": [{
                "name": null,
                "nameFromProfiled": "",
                "description": null,
                "descriptionFromProfiled": null,
                "cardinality": null,
                "concept": "hslnicx7yaely6tdyht",
                "usageNote": {},
                "usageNoteFromProfiled": null,
                "iri": null,
                "profiling": [],
                "externalDocumentationUrl": null,
                "tags": [],
            }, {
                "name": { "en": "Dataset title" },
                "nameFromProfiled": null,
                "description": { "en": "A name given to the dataset." },
                "descriptionFromProfiled": null,
                "cardinality": null,
                "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
                "usageNote": {},
                "usageNoteFromProfiled": null,
                "iri": "terms-title-profile",
                "profiling": ["http://purl.org/dc/terms/title"],
                "externalDocumentationUrl": null,
                "tags": [],
            }],
        } as SemanticModelRelationshipProfile, {
            "id": "http://www.w3.org/ns/Dataset",
            "iri": "http://www.w3.org/ns/Dataset",
            "name": {
                "cs": "Datová sada",
                "en": "Dataset"
            },
            "description": {
                "cs": "Kolekce dat, ke stažení.",
                "en": "A collection of data, published or curated by a single agent, and available for access or download in one or more representations."
            },
            "type": ["class"],
        }, {
            "id": "http://purl.org/dc/terms/title",
            "iri": null,
            "type": ["relationship"],
            "name": {},
            "description": {},
            "ends": [{
                "cardinality": [0, null],
                "name": {},
                "description": {},
                "concept": "http://www.w3.org/2002/07/owl#Thing",
            }, {
                "cardinality": [0, null
                ],
                "name": { "en": "Title" },
                "description": { "en": "A name given to the resource." },
                "concept": null,
                "iri": "http://purl.org/dc/terms/title",
            }],
        }],
    }] as any;

    const context = createContext(containers);

    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

    const expected: ApplicationProfile = {
        "iri": "http://dcat/model/",
        "externalDocumentationUrl": null,
        "classProfiles": [{
            "iri": "http://www.w3.org/ns/Dataset-profile",
            "prefLabel": {},
            "definition": {},
            "usageNote": {},
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
            "externalDocumentationUrl": null,
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
            "externalDocumentationUrl": null,
            "requirementLevel": RequirementLevel.undefined,
            "domainIri": "http://www.w3.org/ns/Dataset-profile",
        }],
        "objectPropertyProfiles": []
    };

    expect(actual).toMatchObject(expected);
});

test("Default test for profiles.", () => {

    const containers: EntityListContainer[] = [{
        "baseIri": "http://dcat/model/",
        "entities": [{
            "id": "hslnicx7yaely6tdyht",
            "profiling": ["http://www.w3.org/ns/Dataset"],
            "type": ["class-profile"],
            "iri": "http://www.w3.org/ns/Dataset-profile",
            "name": null,
            "nameFromProfiled": "http://www.w3.org/ns/Dataset",
            "description": { "": "ignore this" },
            "descriptionFromProfiled": "http://www.w3.org/ns/Dataset",
            "usageNote": { "": "..." },
            "usageNoteFromProfiled": null,
            "externalDocumentationUrl": "http://documenation-1",
            "tags": [],
            controlledVocabularies: [],
        } as SemanticModelClassProfile, {
            "id": "3sww3fqegbxly6tk8z3",
            "type": ["relationship-profile"],
            "ends": [{
                "name": null,
                "description": null,
                "cardinality": null,
                "concept": "hslnicx7yaely6tdyht",
                "usageNote": {},
                "iri": null,
            }, {
                "name": { "en": "Dataset title" },
                "nameFromProfiled": null,
                "description": { "en": "A name given to the dataset." },
                "descriptionFromProfiled": null,
                "usageNote": {},
                "usageNoteFromProfiled": null,
                "cardinality": null,
                "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
                "iri": "terms-title-profile",
                "profiling": ["http://purl.org/dc/terms/title"],
                "externalDocumentationUrl": "http://documenation-2",
                "tags": [],
            }],
        } as SemanticModelRelationshipProfile, {
            "id": "http://www.w3.org/ns/Dataset",
            "iri": "http://www.w3.org/ns/Dataset",
            "name": {
                "cs": "Datová sada",
                "en": "Dataset"
            },
            "description": {
                "cs": "Kolekce dat, ke stažení.",
                "en": "A collection of data, published or curated by a single agent, and available for access or download in one or more representations."
            },
            "type": ["class"],
        } as SemanticModelClass, {
            "id": "http://purl.org/dc/terms/title",
            "iri": null,
            "type": ["relationship"],
            "name": {},
            "description": {},
            "ends": [{
                "cardinality": [0, null],
                "name": {},
                "description": {},
                "concept": "http://www.w3.org/2002/07/owl#Thing",
            }, {
                "cardinality": [0, null
                ],
                "name": { "en": "Title" },
                "description": { "en": "A name given to the resource." },
                "concept": null,
                "iri": "http://purl.org/dc/terms/title",
            }],
        } as SemanticModelRelationship],
    }];

    const context = createContext(containers);

    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0]!, context);

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
            "externalDocumentationUrl": "http://documenation-1",
            "classRole": ClassRole.undefined,
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

    const containers = [{
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
        }, {
            "id": "v5d9yd13by9m8mvndtv",
            "type": ["class-profile"],
            "description": {},
            "descriptionFromProfiled": "dme1xc0ubemm8lqekg1",
            "name": { "en": "Juicy Business" },
            "nameFromProfiled": "dme1xc0ubemm8lqekg1",
            "iri": "juicyBusiness",
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "profiling": ["dme1xc0ubemm8lqekg1"],
        }, {
            "id": "8ut1fqfcd2dm8mvnh2y",
            "type": ["class-profile"],
            "description": {},
            "descriptionFromProfiled": "jv7zjcl0xnfm8lqej9v",
            "name": { "en": "Bulky Force" },
            "nameFromProfiled": "jv7zjcl0xnfm8lqej9v",
            "iri": "bulkyForce",
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "profiling": ["jv7zjcl0xnfm8lqej9v"],
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
        }, {
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
                "concept": "8ut1fqfcd2dm8mvnh2y"
            }, {
                "name": { "en": "Juicy Work" },
                "nameFromProfiled": "flybrmenrykm8mwsi0o",
                "description": {},
                "descriptionFromProfiled": "flybrmenrykm8mwsi0o",
                "iri": "BulkyForce.juicyWork",
                "cardinality": null,
                "usageNote": {},
                "usageNoteFromProfiled": null,
                "profiling": ["flybrmenrykm8mwsi0o"],
                "concept": "v5d9yd13by9m8mvndtv",
            }],
            "id": "vaz6nlwa9am8mwszz2",
            "type": ["relationship-profile"],
        }, {
            "id": "yjtb7fast5lm8mwtnpa",
            "iri": null,
            "child": "8ut1fqfcd2dm8mvnh2y",
            "parent": "v5d9yd13by9m8mvndtv",
            "type": ["generalization"],
        }, {
            "id": "bv12356pl4im8mwu7ty",
            "type": ["relationship-profile"],
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
                "concept": "8ut1fqfcd2dm8mvnh2y",
            }, {
                "name": { "en": "Juicy Work" },
                "nameFromProfiled": "flybrmenrykm8mwsi0o",
                "description": {},
                "descriptionFromProfiled": "flybrmenrykm8mwsi0o",
                "iri": "JuicyBusiness.juicyWorkSpecial",
                "cardinality": null,
                "usageNote": {},
                "usageNoteFromProfiled": null,
                "profiling": ["flybrmenrykm8mwsi0o"],
                "concept": "v5d9yd13by9m8mvndtv",
            }],
        }, {
            "id": "yjtb5fasdt5lm9mwtbcb",
            "iri": null,
            "child": "bv12356pl4im8mwu7ty",
            "parent": "vaz6nlwa9am8mwszz2",
            "type": ["generalization"],
        }],
    }] as any;

    const context = createContext(containers);

    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

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
    const containers = [{
        baseIri: "https://mff-uk.github.io/specifications/dcat-dap#",
        entities: [{
            id: "dataset",
            iri: "http://www.w3.org/ns/dcat#Dataset",
            type: ["class"],
            name: { en: "Dataset" },
            description: { en: "A collection of data" },
            nameProperty: "http://www.example.com/vocabulary#myNameProperty",
            descriptionProperty: "http://www.w3.org/vocabulary#myDescriptionProperty",
        }, {
            id: "dataset-profile",
            type: ["class-profile"],
            iri: "Dataset",
            profiling: ["dataset"],
            name: null,
            nameFromProfiled: "dataset",
            nameProperty: "http://www.example.com/vocabulary#myOtherNameProperty",
            description: null,
            descriptionFromProfiled: "dataset",
            descriptionProperty: null, // test default behavior
            usageNote: {},
            usageNoteFromProfiled: null,
            tags: [],
            externalDocumentationUrl: null,
        }],
    }] as any;

    const context = createContext(containers);
    const actual = entityListContainerToDsvModel(
        "https://mff-uk.github.io/specifications/dcat-dap#",
        containers[0],
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

    const containers = [{
        "baseIri": "http://dcat/model/",
        "entities": [{
            "id": "c1",
            "iri": "c1",
            "type": ["class"],
            "name": {},
            "description": {},
            "nameProperty": "ex:nameProp",
            "descriptionProperty": "ex:descProp",
        }, {
            "id": "p1",
            "iri": "p1",
            "type": ["class-profile"],
            "profiling": ["c1"],
            "name": null,
            "nameFromProfiled": "c1",
            "description": null,
            "descriptionFromProfiled": "c1",
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "tags": [],
        }, {
            "id": "p2",
            "iri": "p2",
            "type": ["class-profile"],
            "profiling": ["p1"],
            "name": null,
            "nameFromProfiled": "p1",
            "nameProperty": "ex:overrideName",
            "description": null,
            "descriptionFromProfiled": "p1",
            "descriptionProperty": "ex:overrideDesc",
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "tags": [],
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
                "nameProperty": "ex:relNameProp",
                "descriptionProperty": "ex:relDescProp",
            }],
        }, {
            "id": "rp1",
            "type": ["relationship-profile"],
            "ends": [{
                "concept": "p1",
                "name": null,
                "description": null,
                "usageNote": {},
            }, {
                "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
                "iri": "attribute-p1",
                "cardinality": null,
                "profiling": ["r1"],
                "name": null,
                "nameFromProfiled": "r1",
                "description": null,
                "descriptionFromProfiled": "r1",
                "usageNote": {},
                "usageNoteFromProfiled": null,
            }],
        }, {
            "id": "rp2",
            "type": ["relationship-profile"],
            "ends": [{
                "concept": "p2",
                "name": null,
                "description": null,
                "usageNote": {},
            }, {
                "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
                "iri": "attribute-p2",
                "cardinality": null,
                "profiling": ["rp1"],
                "name": null,
                "nameFromProfiled": "rp1",
                "nameProperty": "ex:overrideRelName",
                "description": null,
                "descriptionFromProfiled": "rp1",
                "descriptionProperty": "ex:overrideRelDesc",
                "usageNote": {},
                "usageNoteFromProfiled": null,
            }],
        }],
    }] as any;

    const context = createContext(containers);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

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

    const containers = [{
        "baseIri": "http://dcat/model/",
        "entities": [{
            "id": "c1",
            "iri": "c1",
            "type": ["class"],
            "name": {},
            "description": {},
        }, ...combinations.map(({ start, end }, index) => ({
            "id": `rp-${index}`,
            "type": ["relationship-profile"],
            "ends": [{
                "concept": "c1",
                "name": {},
                "description": {},
                "usageNote": {},
            }, {
                "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
                "iri": `property-${index}`,
                "cardinality": [start, end],
                "name": {},
                "description": {},
                "usageNote": {},
                "profiling": [],
            }],
        }))],
    }] as any;

    const context = createContext(containers);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

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

    const containers = [{
        "baseIri": null,
        "entities": [{
            "id": "c1",
            "iri": "relativeClass",
            "type": ["class-profile"],
            "profiling": [],
            "name": {},
            "nameFromProfiled": null,
            "description": {},
            "descriptionFromProfiled": null,
            "usageNote": {},
            "usageNoteFromProfiled": null,
            "tags": [],
        }],
    }] as any;

    const context = createContext(containers);
    const actual = entityListContainerToDsvModel(
        "http://dcat/model/", containers[0], context);

    expect(actual.classProfiles[0]?.iri).toBe("relativeClass");
});
