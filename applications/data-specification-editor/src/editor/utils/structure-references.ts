import { SCHEMA } from "@dataspecer/core/data-psm/data-psm-vocabulary";
import { DataPsmClass, DataPsmExternalRoot, DataPsmOr, DataPsmSchema } from "@dataspecer/core/data-psm/model";
import { FederatedObservableStore } from "@dataspecer/federated-observable-store/federated-observable-store";

/**
 * Semantic entity as it is needed to tell which concept it represents.
 */
interface EntityWithConcept {
  iri?: string | null;

  /**
   * IRIs of the concepts the entity originates from, if it is a profile.
   */
  conceptIris?: string[];

  /**
   * Identifiers of the entities the entity profiles, if it is a profile.
   */
  profiling?: string[];
}

/**
 * Identity of the concept the semantic entity represents. It consists of the
 * entity itself, of the entities it profiles (transitively) and of the
 * concepts it originates from.
 *
 * Two entities represent the same concept when their identities intersect.
 * That way entities profiling the same concept in different profiles are
 * recognized as the same concept.
 */
export function getConceptIdentity(store: FederatedObservableStore, semanticEntityId: string | null | undefined): Set<string> {
  const identity = new Set<string>();
  const visited = new Set<string>();
  const toVisit = semanticEntityId ? [semanticEntityId] : [];

  while (toVisit.length > 0) {
    const entityId = toVisit.pop()!;
    if (visited.has(entityId)) {
      continue;
    }
    visited.add(entityId);
    identity.add(entityId);

    const entity = store.readResource(entityId) as EntityWithConcept | null;
    if (entity === null) {
      continue;
    }
    if (entity.iri) {
      identity.add(entity.iri);
    }
    for (const conceptIri of entity.conceptIris ?? []) {
      identity.add(conceptIri);
    }
    toVisit.push(...(entity.profiling ?? []));
  }

  return identity;
}

/**
 * Concept identity of a root of a structure. The root may be a class, an
 * external root or a choice, in which case any of the choices counts.
 */
function getRootConceptIdentity(store: FederatedObservableStore, rootId: string): Set<string> {
  const root = store.readResource(rootId);

  if (DataPsmClass.is(root)) {
    return getConceptIdentity(store, root.dataPsmInterpretation);
  }
  if (DataPsmExternalRoot.is(root)) {
    return new Set(root.dataPsmTypes.flatMap((type) => [...getConceptIdentity(store, type)]));
  }
  if (DataPsmOr.is(root)) {
    return new Set(root.dataPsmChoices.flatMap((choice) => [...getRootConceptIdentity(store, choice)]));
  }
  return new Set();
}

/**
 * Structure schemas that can be referenced instead of a class representing the
 * given concept. Those are all schemas known to the store, which are the ones
 * of this specification and of the specifications nested in it, whose root
 * represents the same concept.
 */
export function findSchemasToReference(store: FederatedObservableStore, concept: Set<string>): string[] {
  if (concept.size === 0) {
    return [];
  }

  const result: string[] = [];
  for (const schemaId of store.listResourcesOfType(SCHEMA)) {
    const schema = store.readResource(schemaId) as DataPsmSchema | null;
    if (schema === null) {
      continue;
    }
    const matches = schema.dataPsmRoots.some((rootId) => [...getRootConceptIdentity(store, rootId)].some((id) => concept.has(id)));
    if (matches) {
      result.push(schemaId);
    }
  }
  return result;
}
