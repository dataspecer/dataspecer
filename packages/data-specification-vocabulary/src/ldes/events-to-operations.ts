import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import {
  isSemanticModelGeneralization,
  SEMANTIC_MODEL_CLASS,
  SEMANTIC_MODEL_GENERALIZATION,
  SEMANTIC_MODEL_RELATIONSHIP,
  type SemanticModelClass,
  type SemanticModelGeneralization,
  type SemanticModelRelationship,
} from "@dataspecer/core-v2/semantic-model/concepts";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import {
  createRemoveEntityOperation,
  createSetEntityOperation,
  type Operation,
  type Transaction,
} from "@dataspecer/core/operation";
import { OwlPropertyType, type OwlClass, type OwlProperty } from "@dataspecer/lightweight-owl";
import type { ApplicationProfile, TermProfile } from "../semantic-model/dsv-model.ts";
import { isClassProfile, isDatatypePropertyProfile, isObjectPropertyProfile } from "../semantic-model/dsv-model.ts";
import { conceptualModelToEntityListContainer } from "../semantic-model/dsv-to-entity-model.ts";
import type { LdesEvent, LdesEventStream } from "./ldes-model.ts";

export interface LdesToTransactionsContext {

  /**
   * Id of the model the produced operations target.
   */
  modelId: string;

  /**
   * Entities of the target model before the events are applied. May be empty
   * when the stream is consumed from its beginning.
   */
  entities: EntityRecord;

  /**
   * Given an IRI return internal identifier.
   */
  iriToIdentifier: (iri: string) => string;

  /**
   * Called for all referenced class IRIs.
   */
  iriClassToIdentifier?: (iri: string) => string;

  /**
   * Called for all referenced property IRIs.
   */
  iriPropertyToIdentifier?: (iri: string, rangeConcept: string) => string;

  /**
   * Called for every IRI stored to an entity, e.g. to change IRIs from
   * absolute to relative.
   */
  iriUpdate?: (iri: string) => string;

  /**
   * Called to get an identifier for a generalization.
   */
  generalizationIdentifier?: (childIri: string, parentIri: string) => string;

}

/**
 * Translates published LDES events back to internal Dataspecer operations,
 * grouped into transactions the same way as in the stream. Snapshots become
 * generic set entity operations, tombstones become remove entity operations;
 * generalizations folded into the snapshots (dsv:specializes, rdfs:subClassOf)
 * are reconciled against the current state of the target model.
 */
export function ldesToTransactions(stream: LdesEventStream, context: LdesToTransactionsContext): Transaction[] {
  const fullContext: Required<LdesToTransactionsContext> = {
    iriClassToIdentifier: (iri: string) => context.iriToIdentifier(iri),
    iriPropertyToIdentifier: (iri: string, _: string) => context.iriToIdentifier(iri),
    iriUpdate: (iri: string) => iri,
    generalizationIdentifier: (childIri: string, parentIri: string) =>
      `https://dataspecer.com/semantic-models/generalization?fromIri=${childIri}&toIri=${parentIri}`,
    ...context,
  };

  const events = [...stream.events].sort((a, b) => a.sequence - b.sequence);

  const transactions: Transaction[] = [];
  let current: Transaction | null = null;
  const working = { ...context.entities };

  for (const event of events) {
    if (current === null || current.id !== event.transactionId) {
      current = { id: event.transactionId, operations: [] };
      transactions.push(current);
    }
    const operations = eventToOperations(event, working, fullContext);
    current.operations.push(...operations.map((operation) => ({ modelId: context.modelId, operation })));
    applyOperationsToSemanticModel(working, operations);
  }

  return transactions;
}

function eventToOperations(event: LdesEvent, working: EntityRecord, context: Required<LdesToTransactionsContext>): Operation[] {
  if (event.kind === "delete") {
    // @todo Once identity-preserving rename/merge operations exist, use
    // event.replacedByIri to keep the internal id instead of the remove +
    // create pair.
    const id = findEntityIdByIri(working, context.iriUpdate(event.iri)) ?? context.iriToIdentifier(event.iri);
    return [
      ...reconcileGeneralizations(working, id, []),
      createRemoveEntityOperation(id),
    ];
  }
  const snapshot = event.snapshot;
  if (snapshot === null) {
    return [];
  }
  switch (snapshot.kind) {
    case "term-profile":
      return termProfileToOperations(snapshot.termProfile, working, context);
    case "owl-class":
      return owlClassToOperations(snapshot.owlClass, working, context);
    case "owl-property":
      return owlPropertyToOperations(snapshot.owlProperty, working, context);
  }
}

function termProfileToOperations(termProfile: TermProfile, working: EntityRecord, context: Required<LdesToTransactionsContext>): Operation[] {
  const applicationProfile: ApplicationProfile = {
    iri: "",
    externalDocumentationUrl: null,
    classProfiles: [],
    datatypePropertyProfiles: [],
    objectPropertyProfiles: [],
  };
  if (isClassProfile(termProfile)) {
    applicationProfile.classProfiles.push(termProfile);
  } else if (isDatatypePropertyProfile(termProfile)) {
    applicationProfile.datatypePropertyProfiles.push(termProfile);
  } else if (isObjectPropertyProfile(termProfile)) {
    applicationProfile.objectPropertyProfiles.push(termProfile);
  } else {
    console.warn(`Ignoring term profile '${termProfile.iri}' of unknown type.`);
    return [];
  }

  const container = conceptualModelToEntityListContainer(applicationProfile, context);
  const generalizations = container.entities.filter(isSemanticModelGeneralization);
  const entities = container.entities.filter((entity) => !isSemanticModelGeneralization(entity));

  const operations: Operation[] = entities.map(createSetEntityOperation);
  const entityId = entities[0]?.id;
  if (entityId !== undefined) {
    operations.push(...reconcileGeneralizations(working, entityId, generalizations));
  }
  return operations;
}

function owlClassToOperations(owlClass: OwlClass, working: EntityRecord, context: Required<LdesToTransactionsContext>): Operation[] {
  const id = context.iriClassToIdentifier(owlClass.iri);
  const entity: SemanticModelClass = {
    id,
    type: [SEMANTIC_MODEL_CLASS],
    iri: context.iriUpdate(owlClass.iri),
    name: owlClass.name,
    description: owlClass.description,
  };
  const generalizations = owlClass.subClassOf.map((parentIri) => createGeneralization(
    owlClass.iri, id, parentIri, context.iriClassToIdentifier(parentIri), context));
  return [
    createSetEntityOperation(entity),
    ...reconcileGeneralizations(working, id, generalizations),
  ];
}

function owlPropertyToOperations(owlProperty: OwlProperty, working: EntityRecord, context: Required<LdesToTransactionsContext>): Operation[] {
  // Datatypes are kept as IRIs in the semantic model.
  const rangeConcept = owlProperty.type === OwlPropertyType.DatatypeProperty
    ? owlProperty.range
    : context.iriClassToIdentifier(owlProperty.range);
  const id = context.iriPropertyToIdentifier(owlProperty.iri, rangeConcept);
  const entity: SemanticModelRelationship = {
    id,
    type: [SEMANTIC_MODEL_RELATIONSHIP],
    iri: null,
    name: {},
    description: {},
    ends: [{
      iri: null,
      name: {},
      description: {},
      concept: context.iriClassToIdentifier(owlProperty.domain),
    }, {
      iri: context.iriUpdate(owlProperty.iri),
      name: owlProperty.name,
      description: owlProperty.description,
      concept: rangeConcept,
    }],
  };
  const generalizations = owlProperty.subPropertyOf.map((parentIri) => createGeneralization(
    owlProperty.iri, id, parentIri, context.iriToIdentifier(parentIri), context));
  return [
    createSetEntityOperation(entity),
    ...reconcileGeneralizations(working, id, generalizations),
  ];
}

function createGeneralization(
  childIri: string, childId: string, parentIri: string, parentId: string,
  context: Required<LdesToTransactionsContext>,
): SemanticModelGeneralization {
  return {
    id: context.generalizationIdentifier(childIri, parentIri),
    type: [SEMANTIC_MODEL_GENERALIZATION],
    iri: null,
    child: childId,
    parent: parentId,
  };
}

/**
 * The snapshots carry the complete set of generalizations of an entity, so
 * next to setting the new ones, the ones no longer present are removed.
 */
function reconcileGeneralizations(working: EntityRecord, childId: string, next: SemanticModelGeneralization[]): Operation[] {
  const operations: Operation[] = next.map(createSetEntityOperation);
  const nextIds = new Set(next.map((generalization) => generalization.id));
  for (const entity of Object.values(working)) {
    if (isSemanticModelGeneralization(entity) && entity.child === childId && !nextIds.has(entity.id)) {
      operations.push(createRemoveEntityOperation(entity.id));
    }
  }
  return operations;
}

function findEntityIdByIri(working: EntityRecord, iri: string): string | null {
  for (const entity of Object.values(working)) {
    const candidate = entity as { iri?: string | null, ends?: { iri?: string | null }[] };
    if (candidate.iri === iri) {
      return entity.id;
    }
    if (candidate.ends?.some((end) => end?.iri === iri)) {
      return entity.id;
    }
  }
  return null;
}
