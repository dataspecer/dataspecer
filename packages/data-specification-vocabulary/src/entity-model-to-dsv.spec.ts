import { SemanticModelClass, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import { SemanticModelClassProfile, SemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { ClassRole, DsvModel, PropertyProfile, RequirementLevel } from "./dsv-model.ts";
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

    const expected: DsvModel = {
        "iri": "http://dcat/model/",
        "profiles": [{
            "iri": "http://www.w3.org/ns/Dataset-profile",
            "prefLabel": {},
            "definition": {},
            "usageNote": {},
            "profileOfIri": [],
            "reusesPropertyValue": [{
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://www.w3.org/ns/Dataset",
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://www.w3.org/ns/Dataset",
            }],
            "$type": ["class-profile"],
            "profiledClassIri": ["http://www.w3.org/ns/Dataset"],
            "properties": [{
                "iri": "http://dcat/model/terms-title-profile",
                "cardinality": null,
                "prefLabel": { "en": "Dataset title" },
                "definition": { "en": "A name given to the dataset." },
                "usageNote": {},
                "profileOfIri": [],
                "profiledPropertyIri": ["http://purl.org/dc/terms/title"],
                "reusesPropertyValue": [],
                "$type": ["datatype-property-profile"],
                "rangeDataTypeIri": [
                    "http://www.w3.org/2000/01/rdf-schema#Literal"
                ],
                "specializationOfIri": [],
                "externalDocumentationUrl": null,
                "requirementLevel": RequirementLevel.undefined,
            } as PropertyProfile],
            "specializationOfIri": [],
            "classRole": ClassRole.undefined,
            "externalDocumentationUrl": null,
        }],
    };

    expect(actual).toStrictEqual(expected);
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

    const expected: DsvModel = {
        "iri": "http://dcat/model/",
        "profiles": [{
            "iri": "http://www.w3.org/ns/Dataset-profile",
            "prefLabel": {},
            "definition": {},
            "usageNote": { "": "..." },
            "profileOfIri": [],
            "reusesPropertyValue": [{
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://www.w3.org/ns/Dataset",
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://www.w3.org/ns/Dataset",
            }],
            "$type": ["class-profile"],
            "profiledClassIri": ["http://www.w3.org/ns/Dataset"],
            "properties": [{
                "iri": "http://dcat/model/terms-title-profile",
                "cardinality": null,
                "prefLabel": { "en": "Dataset title" },
                "definition": { "en": "A name given to the dataset." },
                "usageNote": {},
                "profileOfIri": [],
                "profiledPropertyIri": ["http://purl.org/dc/terms/title"],
                "reusesPropertyValue": [],
                "$type": ["datatype-property-profile"],
                "rangeDataTypeIri": [
                    "http://www.w3.org/2000/01/rdf-schema#Literal"
                ],
                "specializationOfIri": [],
                "externalDocumentationUrl": "http://documenation-2",
                "requirementLevel": RequirementLevel.undefined,
            } as PropertyProfile],
            "specializationOfIri": [],
            "externalDocumentationUrl": "http://documenation-1",
            "classRole": ClassRole.undefined,
        }],
    };

    expect(actual).toStrictEqual(expected);
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

    const expected: DsvModel = {
        "iri": "http://dcat/model/",
        "profiles": [{
            "iri": "http://dcat/model/juicyBusiness",
            "prefLabel": {},
            "definition": {},
            "usageNote": {},
            "profileOfIri": [],
            "$type": ["class-profile"],
            "properties": [],
            "reusesPropertyValue": [{
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://dcat/model/juicyBusiness"
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://dcat/model/juicyBusiness"
            }],
            "profiledClassIri": ["http://dcat/model/juicyBusiness"],
            "specializationOfIri": [],
            "externalDocumentationUrl": null,
            "classRole": ClassRole.undefined,
        }, {
            "iri": "http://dcat/model/bulkyForce",
            "prefLabel": {},
            "definition": {},
            "usageNote": {},
            "profileOfIri": [],
            "$type": ["class-profile"],
            "properties": [{
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
                "$type": ["object-property-profile"],
                "rangeClassIri": ["http://dcat/model/juicyBusiness"],
                "externalDocumentationUrl": null,
                "requirementLevel": RequirementLevel.undefined,
            } as PropertyProfile, {
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
                "$type": ["object-property-profile"],
                "rangeClassIri": ["http://dcat/model/juicyBusiness"],
                "externalDocumentationUrl": null,
                "requirementLevel": RequirementLevel.undefined,
            } as PropertyProfile],
            "reusesPropertyValue": [{
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
                "propertyReusedFromResourceIri": "http://dcat/model/bulkyForce"
            }, {
                "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#definition",
                "propertyReusedFromResourceIri": "http://dcat/model/bulkyForce"
            }],
            "profiledClassIri": ["http://dcat/model/bulkyForce"],
            "specializationOfIri": ["http://dcat/model/juicyBusiness"],
            "externalDocumentationUrl": null,
            "classRole": ClassRole.undefined,
        }]
    };

    expect(actual).toStrictEqual(expected);

});
