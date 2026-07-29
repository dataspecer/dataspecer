import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import { getDataSpecificationWithModels } from "@dataspecer/specification/specification";
import type {
  AggregatedSemanticModel,
  SpecificationSource,
  StructureModelResource,
} from "@dataspecer/app-generator";
import { resourceModel } from "../main.ts";
import { getModelsForPackage } from "./backend-model-store.ts";

type LoadedModels = Awaited<ReturnType<typeof getModelsForPackage>>;

/** What a profile declares, before the aggregation is applied. */
interface DeclaredEntity {
  iri?: string | null;
  profiling?: string[];
  ends?: { cardinality?: [number, number | null] | null }[];
}

/**
 * For a given project id (id/iri of a package) it returns single aggregated
 * semantic model and an array of the structure models.
 *
 * Both semantic and structure models are array of JSON-serializable entities.
 *
 * The purpose of this function is to provide a simple API that hides the
 * complexity that may change in the future.
 */
export async function getSpecification(projectId: string): Promise<SpecificationSource> {
  const allModels = await getModelsForPackage(projectId, resourceModel);
  const specification = getDataSpecificationWithModels(projectId, allModels);

  // Aggregated semantic model is a single model containing entities.
  const aggregatedWrappedEntities = specification.semanticModelAggregator.getAggregatedEntities();
  const aggregatedSemanticModel = withDeclaredProfileDetails(
    Object.values(aggregatedWrappedEntities).map((entity) => entity.aggregatedEntity),
    allModels
  );

  const dataStructureIds = new Set(
    Object.values(specification.dataSpecifications).flatMap(
      (dataSpecification) => dataSpecification.dataStructures.map((dataStructure) => dataStructure.id)
    )
  );
  const structureModels = [...dataStructureIds]
    .map((id) => Object.values(allModels[id] ?? {}) as unknown as StructureModelResource[])
    .filter((resources) => resources.length > 0);

  return {
    aggregatedSemanticModel,
    structureModels,
  };
}

/**
 * Puts back what the aggregation drops: the cardinality a relationship profile declares and the
 * vocabulary IRI a class profile inherits through another profile. Both are read from the models
 * the specification was built from, where they are still present. `specification-source.spec.ts`
 * fails without this.
 *
 * TODO: this works around behavior of `getAggregatedEntities` that changed with the aggregation
 * rewrite in `@dataspecer/core-v2`. Before it, the same call returned the declared cardinality and
 * an absolute IRI in `conceptIris`. Remove it once the following is settled with the maintainers,
 * either because the aggregation returns both again or because the answers say to read them
 * elsewhere:
 *
 * - Is `getAggregatedEntities` still the way to read a profiled model? Its interface did not
 *   change, `structureModels` of `getDataSpecificationWithModels` is now always empty, and the
 *   only reader of it upstream, `getSpecification`, has no callers, so it may be that the intended
 *   read path moved to `observable-aggregator` and this one is no longer maintained.
 * - Should an aggregated relationship end report the cardinality the profile declares when the
 *   vocabulary it profiles declares none? `SemanticRelationshipProfileAggregator` intersects the
 *   cardinalities of the profiled ends only and then overwrites the end with the result.
 * - Should `conceptIris` of an aggregated class profile carry the IRI reached through another
 *   class profile? `SemanticClassProfileAggregator` collects IRIs from profiled vocabulary classes
 *   and from already aggregated profiles, and does nothing for a plain class profile in between.
 * - Are the aggregated entities we receive meant to be the aggregation output at all? Ours carry
 *   `type: ["relationship", "relationship-profile"]`, while the aggregator's own tests expect
 *   `["relationship-profile", "aggregate"]`.
 */
function withDeclaredProfileDetails(
  aggregatedSemanticModel: AggregatedSemanticModel,
  allModels: LoadedModels
): AggregatedSemanticModel {
  const declared = declaredEntities(allModels);

  return aggregatedSemanticModel.map((entity) => {
    const source = declared.get(entity.id);
    if (source === undefined) {
      return entity;
    }
    const relationship = entity as { ends?: { cardinality?: [number, number | null] | null }[] };
    if (relationship.ends !== undefined) {
      return {
        ...entity,
        ends: relationship.ends.map((end, index) => ({
          ...end,
          cardinality: end.cardinality ?? source.ends?.[index]?.cardinality ?? null,
        })),
      };
    }

    const semanticClass = entity as { iri?: string | null; conceptIris?: string[] };
    if (isAbsoluteIri(semanticClass.iri) || semanticClass.conceptIris?.some(isAbsoluteIri)) {
      return entity;
    }
    const inherited = inheritedIri(entity.id, declared);
    return inherited === null
      ? entity
      : { ...entity, conceptIris: [...(semanticClass.conceptIris ?? []), inherited] };
  });
}

/** Entities of the semantic models by ID, as they are stored. */
function declaredEntities(allModels: LoadedModels): Map<string, DeclaredEntity> {
  const projectModel = allModels["_project_model"] as
    | Record<string, { modelType?: string }>
    | undefined;
  const semanticModelIds = Object.entries(projectModel ?? {})
    .filter(([, entry]) => entry.modelType === LOCAL_SEMANTIC_MODEL)
    .map(([id]) => id);

  const declared = new Map<string, DeclaredEntity>();
  for (const modelId of semanticModelIds) {
    for (const [id, entity] of Object.entries(allModels[modelId] ?? {})) {
      declared.set(id, entity as DeclaredEntity);
    }
  }
  return declared;
}

/** The first absolute IRI found by following what the entity profiles. */
function inheritedIri(id: string, declared: Map<string, DeclaredEntity>): string | null {
  const visited = new Set<string>();
  const queue = [id];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) {
      continue;
    }
    visited.add(current);
    if (isAbsoluteIri(current)) {
      return current;
    }
    const entity = declared.get(current);
    if (entity === undefined) {
      continue;
    }
    if (isAbsoluteIri(entity.iri)) {
      return entity.iri!;
    }
    queue.push(...(entity.profiling ?? []));
  }
  return null;
}

function isAbsoluteIri(iri: string | null | undefined): boolean {
  return typeof iri === "string" && /^[a-z][a-z0-9+.-]*:/i.test(iri);
}
