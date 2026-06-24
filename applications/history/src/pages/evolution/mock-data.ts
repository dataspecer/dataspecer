import { createClass, createRelationship, deleteEntity, modifyRelation } from "@dataspecer/core-v2/semantic-model/operations";
import {
  DataPsmCreateAttribute,
  DataPsmCreateClass,
  DataPsmDeleteClass,
  DataPsmSetCardinality,
  DataPsmSetTechnicalLabel,
} from "@dataspecer/core/data-psm/operation";
import type { ModelRef, PendingChange } from "./types";

/**
 * Sets fields on a freshly constructed data-psm operation instance, typed
 * against the instance so the values are checked the same way they would be
 * if assigned one by one.
 */
function withFields<T extends object>(instance: T, fields: Partial<T>): T {
  return Object.assign(instance, fields);
}

const coreVocabulary: ModelRef = { iri: "https://example.org/models/core-vocabulary", alias: "Core vocabulary", kind: "semantic" };
const dcatApProfile: ModelRef = { iri: "https://example.org/models/dcat-ap-profile", alias: "DCAT-AP profile", kind: "semantic" };
const touristSchema: ModelRef = { iri: "https://example.org/models/tourist-destination-schema", alias: "Tourist destination schema", kind: "structure" };
const jsonLdContextSchema: ModelRef = { iri: "https://example.org/models/jsonld-context-schema", alias: "JSON-LD context schema", kind: "structure" };

const PERSON_IRI = "https://example.org/vocab/Person";
const ADDRESS_IRI = "https://example.org/vocab/Address";
const OBSOLETE_TYPE_IRI = "https://example.org/vocab/ObsoleteType";

/**
 * This is sample data only, illustrating the rendering of different
 * operation types. There is no real change detection yet.
 */
export const mockPendingChanges: PendingChange[] = [
  (() => {
    const operation = createClass({
      iri: PERSON_IRI,
      name: { en: "Person", cs: "Osoba" },
      description: { en: "A natural person." },
    });

    return {
      id: "change-1",
      sourceModel: coreVocabulary,
      occurredAt: "2026-06-20T09:12:00Z",
      summary: "Added class \"Person\"",
      operation,
      proposedOperations: [
        {
          id: "change-1-po-1",
          targetModel: touristSchema,
          operation: withFields(new DataPsmCreateClass(), {
            dataPsmInterpretation: operation.entity.iri ?? null,
            dataPsmHumanLabel: operation.entity.name ?? null,
          }),
        },
        {
          id: "change-1-po-2",
          targetModel: dcatApProfile,
          operation: createClass({
            iri: PERSON_IRI,
            name: operation.entity.name,
            description: operation.entity.description,
          }),
        },
      ],
    };
  })(),
  (() => {
    const operation = modifyRelation("https://example.org/vocab/hasAddress", {
      ends: [
        { iri: null, concept: PERSON_IRI, name: {}, description: {} },
        { iri: null, concept: ADDRESS_IRI, name: { en: "address" }, description: {}, cardinality: [0, 1] },
      ],
    });

    return {
      id: "change-2",
      sourceModel: coreVocabulary,
      occurredAt: "2026-06-21T14:40:00Z",
      summary: "Relaxed cardinality of \"hasAddress\" to optional",
      operation,
      proposedOperations: [
        {
          id: "change-2-po-1",
          targetModel: touristSchema,
          operation: withFields(new DataPsmSetCardinality(), {
            entityId: "https://example.org/psm/tourist-destination/owner-address",
            dataPsmCardinality: [0, 1],
          }),
        },
        {
          id: "change-2-po-2",
          targetModel: dcatApProfile,
          operation: modifyRelation("https://example.org/dcat-ap/profile-hasAddress", operation.entity),
        },
      ],
    };
  })(),
  (() => {
    const operation = createRelationship({
      name: { en: "age" },
      ends: [
        { iri: null, concept: PERSON_IRI, name: {}, description: {} },
        { iri: null, concept: null, name: { en: "age" }, description: {}, cardinality: [0, 1] },
      ],
    });

    return {
      id: "change-3",
      sourceModel: coreVocabulary,
      occurredAt: "2026-06-22T11:05:00Z",
      summary: "Added attribute \"age\" to class \"Person\"",
      operation,
      proposedOperations: [
        {
          id: "change-3-po-1",
          targetModel: touristSchema,
          operation: withFields(new DataPsmCreateAttribute(), {
            dataPsmOwner: "https://example.org/psm/tourist-destination/owner",
            dataPsmDatatype: "http://www.w3.org/2001/XMLSchema#integer",
            dataPsmHumanLabel: operation.entity.name ?? null,
          }),
        },
        {
          id: "change-3-po-2",
          targetModel: jsonLdContextSchema,
          // No dedicated component yet for this operation type, falls back to the generic renderer.
          operation: withFields(new DataPsmSetTechnicalLabel(), {
            dataPsmResource: "https://example.org/psm/jsonld-context/owner",
            dataPsmTechnicalLabel: "age",
          }),
        },
      ],
    };
  })(),
  (() => {
    const operation = deleteEntity(OBSOLETE_TYPE_IRI);

    return {
      id: "change-4",
      sourceModel: coreVocabulary,
      occurredAt: "2026-06-23T16:30:00Z",
      summary: "Removed class \"ObsoleteType\"",
      operation,
      proposedOperations: [
        {
          id: "change-4-po-1",
          targetModel: touristSchema,
          operation: withFields(new DataPsmDeleteClass(), {
            dataPsmClass: "https://example.org/psm/tourist-destination/obsolete-type",
          }),
        },
        {
          id: "change-4-po-2",
          targetModel: dcatApProfile,
          operation: deleteEntity("https://example.org/dcat-ap/profile-ObsoleteType"),
        },
      ],
    };
  })(),
];
