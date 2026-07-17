import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import type { SemanticModelClass, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import {
  createClass,
  createGeneralization,
  createRelationship,
  deleteEntity,
  modifyClass,
} from "@dataspecer/core-v2/semantic-model/operations";
import { createDefaultSemanticModelProfileOperationFactory } from "@dataspecer/core-v2/semantic-model/profile/operations";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import { generateOperationId, type Operation, type Transaction } from "@dataspecer/core/operation";
import { semanticModelToLightweightOwl } from "@dataspecer/lightweight-owl";
import { createDataSpecificationVocabulary } from "../semantic-model/dsv-api-v2.ts";
import { ldesToTransactions } from "./events-to-operations.ts";
import { ldesToRdf } from "./events-to-rdf.ts";
import { rdfToLdes } from "./rdf-to-events.ts";
import { profileTransactionsToLdes, vocabularyTransactionsToLdes } from "./transactions-to-events.ts";

const RDFS_LITERAL = "http://www.w3.org/2000/01/rdf-schema#Literal";

function transaction(modelId: string, operations: Operation[]): Transaction {
  return {
    id: generateOperationId(),
    operations: operations.map((operation) => ({ modelId, operation })),
  };
}

function applyTransactions(entities: EntityRecord, transactions: Transaction[]): EntityRecord {
  const result = { ...entities };
  for (const item of transactions) {
    applyOperationsToSemanticModel(result, item.operations.map((operation) => operation.operation));
  }
  return result;
}

function sortByIri<T extends { iri: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.iri.localeCompare(b.iri));
}

test("Vocabulary operations roundtrip.", async () => {
  const transactions = [
    transaction("voc", [
      createClass({ id: "person", iri: "Person", name: { en: "Person" }, description: {} }),
      createClass({ id: "agent", iri: "Agent", name: { en: "Agent" }, description: {} }),
    ]),
    transaction("voc", [
      createRelationship({
        id: "name-property",
        ends: [{
          iri: null, name: {}, description: {}, concept: "person",
        }, {
          iri: "name", name: { en: "name" }, description: {}, concept: RDFS_LITERAL,
        }],
      }),
      createGeneralization({ id: "person-agent", child: "person", parent: "agent" }),
    ]),
    transaction("voc", [
      modifyClass("person", { name: { en: "Human" } }),
      // Rename of the published IRI.
      modifyClass("agent", { iri: "Actor" }),
    ]),
    transaction("voc", [
      deleteEntity("name-property"),
    ]),
  ];

  const stream = vocabularyTransactionsToLdes({
    streamIri: "http://example.com/voc/ldes",
    publishedModelIri: "http://example.com/voc",
    models: { "voc": {} },
    baseIris: { "voc": "http://example.com/voc#" },
    publishedModelId: "voc",
    transactions,
  });

  expect(stream.events.map((event) => [event.kind, event.iri])).toStrictEqual([
    ["create", "http://example.com/voc#Person"],
    ["create", "http://example.com/voc#Agent"],
    // The generalization is folded into the subClassOf of the person.
    ["update", "http://example.com/voc#Person"],
    ["create", "http://example.com/voc#name"],
    // Both the name and the parent's IRI changed.
    ["update", "http://example.com/voc#Person"],
    ["delete", "http://example.com/voc#Agent"],
    ["create", "http://example.com/voc#Actor"],
    ["delete", "http://example.com/voc#name"],
  ]);
  expect(stream.events.map((event) => event.sequence)).toStrictEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(stream.events[5]!.replacedByIri).toBe("http://example.com/voc#Actor");

  // Roundtrip through RDF.

  const rdf = await ldesToRdf(stream, {});
  const parsedStream = await rdfToLdes(rdf);
  expect(parsedStream).toStrictEqual(stream);

  // Translate the events back to internal operations and compare the
  // published projections of the resulting model and the original one.

  const parsedTransactions = ldesToTransactions(parsedStream, {
    modelId: "reconstructed",
    entities: {},
    iriToIdentifier: (iri) => iri,
  });
  expect(parsedTransactions.length).toBe(transactions.length);

  const reconstructed = applyTransactions({}, parsedTransactions);
  const original = applyTransactions({}, transactions);

  const project = (entities: EntityRecord, baseIri: string | null) => {
    const ontology = semanticModelToLightweightOwl([], [{
      getBaseIri: () => baseIri,
      getEntities: () => entities,
    }], { idDefinedBy: "http://example.com/voc", baseIri: baseIri ?? "" });
    return {
      classes: sortByIri(ontology.classes),
      properties: sortByIri(ontology.properties),
    };
  };

  expect(project(reconstructed, null)).toStrictEqual(project(original, "http://example.com/voc#"));
});

test("IRI reuse within one transaction.", async () => {
  // One transaction deletes an entity and creates another one reusing its
  // IRI: the events must stay distinct members.
  const transactions = [
    transaction("voc", [
      createClass({ id: "a", iri: "Thing", name: { en: "A" }, description: {} }),
    ]),
    transaction("voc", [
      deleteEntity("a"),
      createClass({ id: "b", iri: "Thing", name: { en: "B" }, description: {} }),
    ]),
  ];

  const stream = vocabularyTransactionsToLdes({
    streamIri: "http://example.com/voc/ldes",
    publishedModelIri: "http://example.com/voc",
    models: { "voc": {} },
    baseIris: { "voc": "http://example.com/voc#" },
    publishedModelId: "voc",
    transactions,
  });

  expect(stream.events.map((event) => [event.kind, event.iri])).toStrictEqual([
    ["create", "http://example.com/voc#Thing"],
    ["delete", "http://example.com/voc#Thing"],
    ["create", "http://example.com/voc#Thing"],
  ]);
  expect(new Set(stream.events.map((event) => event.memberIri)).size).toBe(3);

  const parsedStream = await rdfToLdes(await ldesToRdf(stream, {}));
  expect(parsedStream).toStrictEqual(stream);

  const reconstructed = applyTransactions({}, ldesToTransactions(parsedStream, {
    modelId: "reconstructed",
    entities: {},
    iriToIdentifier: (iri) => iri,
  }));
  const entities = Object.values(reconstructed);
  expect(entities.length).toBe(1);
  expect(entities[0]).toMatchObject({ iri: "http://example.com/voc#Thing", name: { en: "B" } });
});

test("Application profile operations roundtrip.", async () => {
  const factory = createDefaultSemanticModelProfileOperationFactory();

  const datasetClass: SemanticModelClass = {
    id: "dataset", type: ["class"], iri: "http://example.com/voc#Dataset",
    name: { en: "Dataset" }, description: { en: "A dataset." },
  };
  const titleProperty: SemanticModelRelationship = {
    id: "title-property", type: ["relationship"], iri: null, name: {}, description: {},
    ends: [{
      iri: null, name: {}, description: {}, concept: "dataset",
    }, {
      iri: "http://example.com/voc#title", name: { en: "title" }, description: {}, concept: RDFS_LITERAL,
    }],
  };
  const vocabulary: EntityRecord = {
    [datasetClass.id]: datasetClass,
    [titleProperty.id]: titleProperty,
  };

  const transactions = [
    transaction("ap", [
      factory.createClassProfile({
        id: "dataset-profile", iri: "DatasetProfile", profiling: ["dataset"],
        name: { en: "Dataset profile" }, nameFromProfiled: null,
        description: {}, descriptionFromProfiled: "dataset",
        usageNote: { en: "Use for datasets." }, usageNoteFromProfiled: null,
      }),
    ]),
    transaction("ap", [
      factory.createRelationshipProfile({
        id: "title-profile",
        ends: [{
          concept: "dataset-profile",
        }, {
          concept: RDFS_LITERAL, iri: "titleProfile", profiling: ["title-property"],
          name: { en: "title profile" }, nameFromProfiled: null,
          description: {}, descriptionFromProfiled: "title-property",
          usageNote: {}, usageNoteFromProfiled: null,
          cardinality: [0, 1],
        }],
      }),
    ]),
    transaction("ap", [
      factory.modifyClassProfile("dataset-profile", { name: { en: "Dataset profile v2" } }),
    ]),
    transaction("ap", [
      // Rename of the published IRI; the domain of the title profile changes
      // with it.
      factory.modifyClassProfile("dataset-profile", { iri: "CatalogRecordProfile" }),
    ]),
    transaction("ap", [
      deleteEntity("title-profile"),
    ]),
  ];

  const models = { "voc": vocabulary, "ap": {} };
  const baseIris = { "voc": "http://example.com/voc#", "ap": "http://example.com/ap#" };

  const stream = profileTransactionsToLdes({
    streamIri: "http://example.com/ap/ldes",
    publishedModelIri: "http://example.com/ap",
    models,
    baseIris,
    publishedModelId: "ap",
    transactions,
  });

  expect(stream.events.map((event) => [event.kind, event.iri])).toStrictEqual([
    ["create", "http://example.com/ap#DatasetProfile"],
    ["create", "http://example.com/ap#titleProfile"],
    ["update", "http://example.com/ap#DatasetProfile"],
    ["delete", "http://example.com/ap#DatasetProfile"],
    ["create", "http://example.com/ap#CatalogRecordProfile"],
    ["update", "http://example.com/ap#titleProfile"],
    ["delete", "http://example.com/ap#titleProfile"],
  ]);
  expect(stream.events[3]!.replacedByIri).toBe("http://example.com/ap#CatalogRecordProfile");

  // The description is inherited from the profiled class, so it is published
  // as a property value reuse.
  const datasetProfileSnapshot = stream.events[0]!.snapshot;
  expect(datasetProfileSnapshot?.kind).toBe("term-profile");
  if (datasetProfileSnapshot?.kind === "term-profile") {
    expect(datasetProfileSnapshot.termProfile.reusesPropertyValue).toStrictEqual([{
      reusedPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
      reusedAsPropertyIri: "http://www.w3.org/2004/02/skos/core#definition",
      propertyReusedFromResourceIri: "http://example.com/voc#Dataset",
    }]);
  }

  // Roundtrip through RDF.

  const rdf = await ldesToRdf(stream, {});
  const parsedStream = await rdfToLdes(rdf);
  expect(parsedStream).toStrictEqual(stream);

  // Translate the events back to internal operations and compare the
  // published (DSV) projections of the resulting model and the original one.

  const iriToIdentifier: Record<string, string> = {
    "http://example.com/voc#Dataset": "dataset",
    "http://example.com/voc#title": "title-property",
  };
  const parsedTransactions = ldesToTransactions(parsedStream, {
    modelId: "reconstructed",
    entities: {},
    iriToIdentifier: (iri) => iriToIdentifier[iri] ?? iri,
  });
  expect(parsedTransactions.length).toBe(transactions.length);

  const reconstructed = applyTransactions({}, parsedTransactions);
  const original = applyTransactions({}, transactions);

  const project = (entities: EntityRecord, baseIri: string | null) => {
    const dsv = createDataSpecificationVocabulary(
      { semantics: [{ getBaseIri: () => baseIris["voc"], getEntities: () => vocabulary }], profiles: [] },
      [{ getBaseIri: () => baseIri, getEntities: () => entities }],
      { iri: "http://example.com/ap" },
    );
    return {
      classProfiles: sortByIri(dsv.classProfiles),
      datatypePropertyProfiles: sortByIri(dsv.datatypePropertyProfiles),
      objectPropertyProfiles: sortByIri(dsv.objectPropertyProfiles),
    };
  };

  expect(project(reconstructed, null)).toStrictEqual(project(original, baseIris["ap"]));
});
