import { rdfToDsv } from "./rdf-to-dsv.ts";
import { Cardinality, ClassRole, ApplicationProfile, ObjectPropertyProfile, RequirementLevel, ClassProfile } from "./dsv-model.ts";
import { conceptualModelToEntityListContainer } from "./dsv-to-entity-model.ts";
import { DataTypeURIs, isPrimitiveType } from "@dataspecer/core-v2/semantic-model/datatypes";
import { isSemanticModelClass, isSemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";

test("Regression test.", async () => {

  const inputRdf = `@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
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
@prefix : <http://dcat-ap-cz/model>.


<http://dcat-ap-cz/model> a prof:Profile, dsv:ApplicationProfile.

<https://dcat-ap/#Dataset> dct:isPartOf <http://dcat-ap-cz/model>;
    a dsv:TermProfile;
    dsv:reusesPropertyValue [
  a dsv:PropertyValueReuse;
  dsv:reusedProperty skos:prefLabel;
  dsv:reusedFromResource <http://www.w3.org/ns/dcat#Dataset>
], [
  a dsv:PropertyValueReuse;
  dsv:reusedProperty skos:scopeNote;
  dsv:reusedFromResource <http://www.w3.org/ns/dcat#Dataset>
];
    dsv:externalDocumentation <http://documentation>;
    a dsv:ClassProfile;
    dsv:class <http://www.w3.org/ns/dcat#Dataset>;
    dsv:classRole role:main.

<http://www.w3.org/ns/dcat#distribution-profile> dsv:domain <https://dcat-ap/#Dataset>;
    dct:isPartOf <http://dcat-ap-cz/model>;
    a dsv:TermProfile;
    dsv:reusesPropertyValue [
  a dsv:PropertyValueReuse;
  dsv:reusedProperty skos:prefLabel;
  dsv:reusedFromResource <http://dcat-ap/ns/dcat#Distribution>
], [
  a dsv:PropertyValueReuse;
  dsv:reusedProperty skos:scopeNote;
  dsv:reusedFromResource <http://dcat-ap/ns/dcat#Distribution>
];
    dsv:cardinality cardinality:0n;
    dsv:property <http://www.w3.org/ns/dcat#distribution>;
    a dsv:ObjectPropertyProfile;
    dsv:objectPropertyRange <http://dcat-ap/ns/dcat#Distribution>.

<https://dcat-ap-cz/#Dataset> dct:isPartOf <http://dcat-ap-cz/model>;
    a dsv:TermProfile;
    dsv:profileOf <https://dcat-ap/#Dataset>;
    a dsv:ClassProfile;
    dsv:classRole role:main.

<http://dcat-ap/ns/dcat#Distribution> dct:isPartOf <http://dcat-ap-cz/model>;
    a dsv:TermProfile, dsv:ClassProfile;
    dsv:class <http://www.w3.org/ns/dcat#Distribution>;
    dsv:classRole role:supportive.
`;

  // Grab the first model.
  const actualModels = await rdfToDsv(inputRdf);
  expect(actualModels.length).toBe(1);

  const expectedModel: ApplicationProfile = {
    "iri": "http://dcat-ap-cz/model",
    "externalDocumentationUrl": null,
    "classProfiles": [{
      "iri": "https://dcat-ap/#Dataset",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "type": ["class-profile"],
      "profiledClassIri": ["http://www.w3.org/ns/dcat#Dataset"],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://www.w3.org/ns/dcat#Dataset",
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#scopeNote",
        "propertyReusedFromResourceIri": "http://www.w3.org/ns/dcat#Dataset",
      }],
      "externalDocumentationUrl": "http://documentation",
      "classRole": ClassRole.main,
      "specializationOfIri": [],
    }, {
      "iri": "https://dcat-ap-cz/#Dataset",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": ["https://dcat-ap/#Dataset"],
      "type": ["class-profile"],
      "profiledClassIri": [],
      "reusesPropertyValue": [],
      "specializationOfIri": [],
      "externalDocumentationUrl": null,
      "classRole": ClassRole.main,
    }, {
      "iri": "http://dcat-ap/ns/dcat#Distribution",
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "type": ["class-profile"],
      "profiledClassIri": ["http://www.w3.org/ns/dcat#Distribution"],
      "reusesPropertyValue": [],
      "specializationOfIri": [],
      "externalDocumentationUrl": null,
      "classRole": ClassRole.supportive,
    }],
    "datatypePropertyProfiles": [],
    "objectPropertyProfiles": [{
      "iri": "http://www.w3.org/ns/dcat#distribution-profile",
      "cardinality": Cardinality.ZeroToMany,
      "prefLabel": {},
      "definition": {},
      "usageNote": {},
      "profileOfIri": [],
      "profiledPropertyIri": ["http://www.w3.org/ns/dcat#distribution"],
      "type": ["object-property-profile"],
      "rangeClassIri": [
        "http://dcat-ap/ns/dcat#Distribution"
      ],
      "reusesPropertyValue": [{
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#prefLabel",
        "propertyReusedFromResourceIri": "http://dcat-ap/ns/dcat#Distribution",
      }, {
        "reusedPropertyIri": "http://www.w3.org/2004/02/skos/core#scopeNote",
        "propertyReusedFromResourceIri": "http://dcat-ap/ns/dcat#Distribution",
      }],
      "specializationOfIri": [],
      "externalDocumentationUrl": null,
      "requirementLevel": RequirementLevel.undefined,
      "domainIri": "https://dcat-ap/#Dataset",
    }],
  };

  expect(actualModels[0]).toStrictEqual(expectedModel);
});

test("Issue #989", async () => {

  const inputRdf = `
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix dct: <http://purl.org/dc/terms/>.
@prefix dsv: <https://w3id.org/dsv#>.
@prefix owl: <http://www.w3.org/2002/07/owl#>.
@prefix skos: <http://www.w3.org/2004/02/skos/core#>.

<http://localhost/applicationProfileConceptualModel> a dsv:ApplicationProfile.

<http://localhost/Source[profile]> dct:isPartOf <http://localhost/applicationProfileConceptualModel>;
    a dsv:TermProfile;
    skos:prefLabel "Source [profile]"@en;
    dsv:reusesPropertyValue _:n3-811.
_:n3-811 a dsv:PropertyValueReuse;
    dsv:reusedProperty skos:definition;
    dsv:reusedFromResource <http://localhost/Source>.

<http://localhost/Source[profile]> a dsv:ClassProfile;
    dsv:class <http://localhost/Source>.

<http://localhost/Source[profile].attribute[profile]> dsv:domain <http://localhost/Source[profile]>;
    dct:isPartOf <http://localhost/applicationProfileConceptualModel>;
    a dsv:TermProfile;
    skos:prefLabel "attribute [profile]"@en;
    dsv:reusesPropertyValue _:n3-812.
_:n3-812 a dsv:PropertyValueReuse;
    dsv:reusedProperty skos:definition;
    dsv:reusedFromResource <http://localhost/relation>.

<http://localhost/Source[profile].attribute[profile]> dsv:property <http://localhost/relation>;
    a dsv:DatatypePropertyProfile;
    dsv:datatypePropertyRange rdfs:Literal.

<http://localhost/Target[profile]> dct:isPartOf <http://localhost/applicationProfileConceptualModel>;
    a dsv:TermProfile;
    skos:prefLabel "Target [profile]"@en;
    dsv:reusesPropertyValue _:n3-813.
_:n3-813 a dsv:PropertyValueReuse;
    dsv:reusedProperty skos:definition;
    dsv:reusedFromResource <http://localhost/Target>.

<http://localhost/Target[profile]> a dsv:ClassProfile;
    dsv:class <http://localhost/Target>.
  `;

  const vocabulary = [{
    "id": "eaynf42zsiim7i2cgh5",
    "iri": "http://localhost/Source",
    "type": ["class"],
    "name": { "en": "Source" },
    "description": {}
  }, {
    "id": "mu4tiwoio3dm7i2ctqo",
    "iri": "http://localhost/Target",
    "type": ["class"],
    "name": { "en": "Target" },
    "description": {}
  }, {
    "id": "y8u9pfm70wlm7i2dbug",
    "type": ["relationship"],
    "iri": null,
    "name": {},
    "description": {},
    "ends": [{
      "name": {},
      "description": {},
      "concept": "eaynf42zsiim7i2cgh5",
      "iri": null
    }, {
      "name": { "en": "attribute" },
      "description": {},
      "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
      "iri": "http://localhost/relation"
    }],
  }, { // We add association after the attribute.
    "id": "as8nbs15bym7i2d4ky",
    "type": ["relationship"],
    "iri": null,
    "name": {},
    "description": {},
    "ends": [{
      "name": {},
      "description": {},
      "cardinality": null,
      "concept": "eaynf42zsiim7i2cgh5",
      "iri": null
    }, {
      "name": { "en": "association" },
      "description": {},
      "cardinality": null,
      "concept": "mu4tiwoio3dm7i2ctqo",
      "iri": "http://localhost/relation"
    }],
  }];

  // Example of building the mapping.

  const knownMapping: Record<string, string> = {};
  // We encode association/profile information here.
  const knownRelationshipMapping: Record<string, string> = {};
  for (const datatype of DataTypeURIs) {
    knownMapping[datatype] = datatype
  }

  for (const entity of vocabulary) {
    if (isSemanticModelClass(entity)) {
      knownMapping[entity.iri!] = entity.id;
    }
    if (isSemanticModelRelationship(entity)) {
      if (entity.iri) {
        knownMapping[entity.iri!] = entity.id;
      }
      for (const end of entity.ends) {
        if (end.iri) {
          //
          const isAttribute = isPrimitiveType(end.concept);
          const key = isAttribute + ":" + end.iri;
          knownRelationshipMapping[key] = entity.id;
        }
      }
    }
  }

  //

  const dsv = await rdfToDsv(inputRdf);
  expect(dsv.length).toBe(1);

  let counter = 0;
  const actualEntities = conceptualModelToEntityListContainer(dsv[0]!, {
    generalizationIdentifier: () => `id-${++counter}`,
    // We use the IRI as an identifier here.
    // Should be good enough for test, do not repeat elsewhere.
    iriToIdentifier: iri => knownMapping[iri] ?? iri,
    //
    iriPropertyToIdentifier: (iri, rangeConcept) => {
      const isAttribute = isPrimitiveType(rangeConcept);
      const key = isAttribute + ":" + iri;
      return knownRelationshipMapping[key] ?? iri;
    },
  });

  expect(actualEntities).toStrictEqual({
    "baseIri": "",
    "entities": [{
      "description": {},
      "descriptionFromProfiled": "eaynf42zsiim7i2cgh5",
      "id": "http://localhost/Source[profile]",
      "iri": "http://localhost/Source[profile]",
      "name": { "en": "Source [profile]" },
      "nameFromProfiled": null,
      "profiling": ["eaynf42zsiim7i2cgh5"],
      "type": ["class-profile"],
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "externalDocumentationUrl": null,
      "tags": [],
    }, {
      "description": {},
      "descriptionFromProfiled": "mu4tiwoio3dm7i2ctqo",
      "id": "http://localhost/Target[profile]",
      "iri": "http://localhost/Target[profile]",
      "name": { "en": "Target [profile]" },
      "nameFromProfiled": null,
      "profiling": ["mu4tiwoio3dm7i2ctqo"],
      "type": ["class-profile"],
      "usageNote": {},
      "usageNoteFromProfiled": null,
      "externalDocumentationUrl": null,
      "tags": [],
    }, {
      "ends": [{
        "cardinality": null,
        "concept": "http://localhost/Source[profile]",
        "description": {},
        "descriptionFromProfiled": null,
        "iri": null,
        "name": {},
        "nameFromProfiled": null,
        "profiling": [],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "externalDocumentationUrl": null,
        "tags": [],
      }, {
        "cardinality": null,
        "concept": "http://www.w3.org/2000/01/rdf-schema#Literal",
        "description": {},
        "descriptionFromProfiled": "y8u9pfm70wlm7i2dbug",
        "iri": "http://localhost/Source[profile].attribute[profile]",
        "name": {
          "en": "attribute [profile]",
        },
        "nameFromProfiled": null,
        "profiling": ["y8u9pfm70wlm7i2dbug"],
        "usageNote": {},
        "usageNoteFromProfiled": null,
        "externalDocumentationUrl": null,
        "tags": [],
      },
      ],
      "id": "http://localhost/Source[profile].attribute[profile]",
      "type": ["relationship-profile",],
    }],
  });

});
