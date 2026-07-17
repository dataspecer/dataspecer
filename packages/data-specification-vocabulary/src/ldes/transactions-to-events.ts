import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import {
  isSemanticModelClassProfile,
  isSemanticModelRelationshipProfile,
} from "@dataspecer/core-v2/semantic-model/profile/concepts";
import type { Entity, EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation, Transaction } from "@dataspecer/core/operation";
import { semanticModelToLightweightOwl } from "@dataspecer/lightweight-owl";
import { deepEqual } from "@dataspecer/utilities";
import { createDataSpecificationVocabulary } from "../semantic-model/dsv-api-v2.ts";
import type { TermProfile } from "../semantic-model/dsv-model.ts";
import type { LdesEvent, LdesEventKind, LdesEventStream, LdesResourceSnapshot } from "./ldes-model.ts";

export interface TransactionsToLdesInput {

  /**
   * IRI of the event stream itself.
   */
  streamIri: string;

  /**
   * IRI under which the model is published: the application profile IRI or
   * the ontology IRI.
   */
  publishedModelIri: string;

  /**
   * State of all models before the first transaction, keyed by model id. Must
   * contain the published model and all models it depends on.
   */
  models: Record<string, EntityRecord>;

  /**
   * Base IRI of each model, when known.
   */
  baseIris: Record<string, string | null>;

  /**
   * Key in {@link models} of the model whose published representation the
   * stream tracks.
   */
  publishedModelId: string;

  /**
   * All transactions, oldest first.
   */
  transactions: Transaction[];

  /**
   * Recorded time of a transaction. Defaults to the time encoded in its
   * uuidv7 identifier.
   */
  transactionTime?: (transaction: Transaction) => Date;

}

/**
 * Derives the published operations of an application profile model from its
 * internal transactions. This is the translation layer between internal
 * operations and the published LDES: the transactions are replayed on a copy
 * of the models and after each transaction the published (DSV) projection is
 * diffed with the previous one - keyed by the internal entity id, so an IRI
 * rename is reported as a delete tombstone pointing to the new IRI followed
 * by a create, instead of an unrelated delete and create.
 */
export function profileTransactionsToLdes(input: TransactionsToLdesInput): LdesEventStream {
  return transactionsToEvents(input, projectProfileModel);
}

/**
 * Same as {@link profileTransactionsToLdes}, but for a vocabulary model whose
 * published representation is the lightweight OWL ontology.
 */
export function vocabularyTransactionsToLdes(input: TransactionsToLdesInput): LdesEventStream {
  return transactionsToEvents(input, projectVocabularyModel);
}

/**
 * Published resource of the model, keyed by the internal entity id.
 */
interface PublishedResource {
  iri: string;
  snapshot: LdesResourceSnapshot;
}

type Projection = (input: TransactionsToLdesInput, models: Record<string, EntityRecord>) => Map<string, PublishedResource>;

function transactionsToEvents(input: TransactionsToLdesInput, project: Projection): LdesEventStream {
  const transactionTime = input.transactionTime ?? timeFromUuidv7;

  let models = input.models;
  let previous = project(input, models);
  const events: LdesEvent[] = [];

  for (const transaction of input.transactions) {
    // @todo Once operations that change entity identity exist (e.g. merging
    // two entities into one), inspect the operations of the transaction here
    // and pair the affected internal ids, so the diff below reports a rename
    // instead of an unrelated delete + create.

    // @todo Once Dataspecer supports marking versions, detect the version
    // marker operation here: all pending events up to it get the version's
    // publication time as `issued` while `created` keeps the recorded time.

    models = applyTransaction(models, transaction);
    const next = project(input, models);
    const timestamp = transactionTime(transaction).toISOString();

    const push = (kind: LdesEventKind, iri: string, snapshot: LdesResourceSnapshot | null, replacedByIri?: string) => {
      events.push({
        kind,
        iri,
        memberIri: createVersionIri(iri, transaction.id, events.length),
        transactionId: transaction.id,
        created: timestamp,
        issued: timestamp,
        sequence: events.length,
        snapshot,
        ...(replacedByIri === undefined ? {} : { replacedByIri }),
      });
    };

    for (const [id, before] of previous) {
      const after = next.get(id);
      if (after === undefined) {
        push("delete", before.iri, null);
      } else if (after.iri !== before.iri) {
        // The resource was renamed: publish a tombstone pointing to the new
        // IRI, followed by a create under the new IRI.
        push("delete", before.iri, null, after.iri);
        push("create", after.iri, after.snapshot);
      } else if (!deepEqual(before.snapshot, after.snapshot)) {
        push("update", after.iri, after.snapshot);
      }
    }
    for (const [id, after] of next) {
      if (!previous.has(id)) {
        push("create", after.iri, after.snapshot);
      }
    }

    previous = next;
  }

  return {
    iri: input.streamIri,
    publishedModelIri: input.publishedModelIri,
    events,
  };
}

function applyTransaction(models: Record<string, EntityRecord>, transaction: Transaction): Record<string, EntityRecord> {
  const operationsByModel = new Map<string, Operation[]>();
  for (const { modelId, operation } of transaction.operations) {
    let operations = operationsByModel.get(modelId);
    if (operations === undefined) {
      operations = [];
      operationsByModel.set(modelId, operations);
    }
    operations.push(operation);
  }

  const result = { ...models };
  for (const [modelId, operations] of operationsByModel) {
    const entities = { ...(result[modelId] ?? {}) };
    applyOperationsToSemanticModel(entities, operations);
    result[modelId] = entities;
  }
  return result;
}

/**
 * Extracts the timestamp encoded in a uuidv7 transaction id; falls back to
 * the epoch for other identifiers.
 */
function timeFromUuidv7(transaction: Transaction): Date {
  const match = /^([0-9a-f]{8})-([0-9a-f]{4})-7/.exec(transaction.id);
  if (match === null) {
    return new Date(0);
  }
  return new Date(parseInt(match[1]! + match[2]!, 16));
}

/**
 * IRI of the member (version object) of a resource in a transaction. The
 * sequence keeps it unique even when one transaction retires and reissues the
 * same canonical IRI (e.g. deleting an entity and creating another with the
 * same IRI).
 */
function createVersionIri(iri: string, transactionId: string, sequence: number): string {
  return iri + (iri.includes("#") ? "-" : "#") + transactionId + "-" + sequence;
}

function projectProfileModel(input: TransactionsToLdesInput, models: Record<string, EntityRecord>): Map<string, PublishedResource> {
  const wrap = (id: string) => ({
    getBaseIri: () => input.baseIris[id] ?? null,
    getEntities: () => models[id] ?? {},
  });
  const dependencies = Object.keys(models)
    .filter((id) => id !== input.publishedModelId)
    .map(wrap);

  const dsv = createDataSpecificationVocabulary(
    { semantics: dependencies, profiles: [] },
    [wrap(input.publishedModelId)],
    { iri: input.publishedModelIri },
  );

  const profilesByIri = new Map<string, TermProfile>();
  for (const profile of [...dsv.classProfiles, ...dsv.datatypePropertyProfiles, ...dsv.objectPropertyProfiles]) {
    profilesByIri.set(profile.iri, profile);
  }

  const baseIri = input.baseIris[input.publishedModelId] ?? null;
  const result = new Map<string, PublishedResource>();
  for (const entity of Object.values(models[input.publishedModelId] ?? {})) {
    if (!isSemanticModelClassProfile(entity) && !isSemanticModelRelationshipProfile(entity)) {
      // Generalizations are folded into dsv:specializes of the term profiles.
      continue;
    }
    const iri = entityToIri(entity, baseIri);
    const termProfile = profilesByIri.get(iri);
    if (termProfile === undefined) {
      continue;
    }
    result.set(entity.id, { iri, snapshot: { kind: "term-profile", termProfile } });
  }
  return result;
}

/**
 * Mirrors the IRI resolution of the DSV conversion: relationships store the
 * IRI on the range end, relative IRIs are resolved against the model base.
 */
function entityToIri(entity: Entity, baseIri: string | null): string {
  let iri: string | null = null;
  if (isSemanticModelRelationshipProfile(entity)) {
    const [_, range] = entity.ends;
    iri = range?.iri ?? null;
  } else {
    iri = (entity as { iri?: string | null }).iri ?? null;
  }
  iri = iri ?? entity.id;
  if (iri.includes("://")) {
    return iri;
  }
  return (baseIri ?? "") + iri;
}

function projectVocabularyModel(input: TransactionsToLdesInput, models: Record<string, EntityRecord>): Map<string, PublishedResource> {
  const wrap = (id: string) => ({
    getBaseIri: () => input.baseIris[id] ?? null,
    getEntities: () => models[id] ?? {},
  });
  const referenceModels = Object.keys(models)
    .filter((id) => id !== input.publishedModelId)
    .map(wrap);

  const { classMapId, propertyMapId } = semanticModelToLightweightOwl(
    referenceModels,
    [wrap(input.publishedModelId)],
    {
      idDefinedBy: input.publishedModelIri,
      baseIri: input.baseIris[input.publishedModelId] ?? "",
    },
  );

  const publishedEntities = models[input.publishedModelId] ?? {};
  const result = new Map<string, PublishedResource>();
  for (const [id, owlClass] of Object.entries(classMapId)) {
    if (publishedEntities[id] === undefined) {
      continue;
    }
    result.set(id, { iri: owlClass.iri, snapshot: { kind: "owl-class", owlClass } });
  }
  for (const [id, owlProperty] of Object.entries(propertyMapId)) {
    if (publishedEntities[id] === undefined) {
      continue;
    }
    result.set(id, { iri: owlProperty.iri, snapshot: { kind: "owl-property", owlProperty } });
  }
  return result;
}
