import {
  ApplicationProfileAggregator,
  MergeAggregator,
  VocabularyAggregator,
  type EntityModel,
  type SemanticModelAggregator,
} from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { LOCAL_SEMANTIC_MODEL, RDFS_MODEL } from "@dataspecer/core-v2/model/known-models";
import { isSemanticModelClass, isSemanticModelGeneralization, isSemanticModelRelationship, type LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import { isSemanticModelClassProfile, isSemanticModelRelationshipProfile } from "@dataspecer/core-v2/semantic-model/profile/concepts";
import { diffEntities, type Entity, type EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation } from "@dataspecer/core/operation";
import { getModelMetadata, type DefaultFrontendModelStore } from "@dataspecer/model-store/implementation";
import { applyOperationsToSemanticModel } from "@dataspecer/core-v2/semantic-model";
import { analyzeEvolution, analyzeProfileEvolution } from "@dataspecer/profile-model/hooks";
import type { ProjectModelEntity } from "@dataspecer/project-model";
import { getAggregatedEntitiesWithPassthroughForPackage } from "@/components/operation-row/operation-list";
import type { OperationRowProps } from "@/components/operation-row/operation-row";
import { modelTypesFromProjectModel } from "@/lib/model-display";
import { applyToModel, computeModelSnapshots } from "@/lib/model-snapshots";
import { collectGroupOperations, type ReviewGroup, type ReviewItem, type ReviewState } from "./review-state";

/**
 * Data layer of the evolution pages: pending upstream operations fetched from
 * the backend's evolution branches, the dependency edges between the project's
 * semantic models, and the per-edge analysis.
 */

// ---------------------------------------------------------------------------
// Pending operations
// ---------------------------------------------------------------------------

interface BackendOperation {
  id: number;
  modelId: string;
  order: number;
  data: Operation;
}

interface BranchInfo {
  id: number;
  name: string | null;
  resourceIri: string | null;
}

async function fetchBranches(backendUrl: string, projectIri: string): Promise<BranchInfo[]> {
  const url = new URL(`${backendUrl}/transactions/branches`, window.location.origin);
  url.searchParams.set("projectIri", projectIri);
  const response = await fetch(url.toString());
  if (!response.ok) return [];
  const result = (await response.json()) as { branches: BranchInfo[] };
  return result.branches;
}

async function fetchBranchDiff(backendUrl: string, projectIri: string, branchId: number): Promise<BackendOperation[]> {
  const range = `main..[${branchId}]`;
  const url = new URL(`${backendUrl}/transactions/log/${encodeURIComponent(range)}`, window.location.origin);
  url.searchParams.set("projectIri", projectIri);
  const response = await fetch(url.toString());
  if (!response.ok) return [];
  const result = (await response.json()) as { transactions: { operations: BackendOperation[] }[] };
  return result.transactions.flatMap((tx) => tx.operations);
}

/** One evolution branch of the project with its pending operations. */
export interface EvolutionBranch {
  branchId: number;
  resourceIri: string;
  operations: { modelId: string; operation: Operation }[];
}

/**
 * Fetches every evolution branch of the project (one per model currently
 * being updated) together with its pending operations.
 */
export async function fetchEvolutionBranches(backendUrl: string, projectIri: string): Promise<EvolutionBranch[]> {
  const branches = await fetchBranches(backendUrl, projectIri);
  const evolutionBranches = branches.filter((branch) => branch.resourceIri !== null);
  return Promise.all(
    evolutionBranches.map(async (branch) => ({
      branchId: branch.id,
      resourceIri: branch.resourceIri!,
      operations: (await fetchBranchDiff(backendUrl, projectIri, branch.id)).map((operation) => ({ modelId: operation.modelId, operation: operation.data })),
    })),
  );
}

/** Groups the pending operations of one branch by the model they target. */
export function branchOperationsByModel(branch: EvolutionBranch): Map<string, Operation[]> {
  const byModel = new Map<string, Operation[]>();
  for (const { modelId, operation } of branch.operations) {
    if (!byModel.has(modelId)) byModel.set(modelId, []);
    byModel.get(modelId)!.push(operation);
  }
  return byModel;
}

/**
 * Resolves the pending operations of the given branches as one transaction on
 * top of the current state of the models they target, rendered exactly like
 * the history page renders a transaction's operations — so the raw upstream
 * changes read the same way wherever they are reviewed.
 */
export function describeBranchOperations(modelStore: DefaultFrontendModelStore, branches: EvolutionBranch[]): OperationRowProps[] {
  const operations = branches.flatMap((branch) => branch.operations);
  const snapshots = computeModelSnapshots([{ operations }], modelTypesFromProjectModel(modelStore.getAllEntities()[modelStore.projectModelId] ?? {}), modelStore.projectModelId, modelStore.getAllEntities())[0] ?? [];
  return operations.map((operation, index) => {
    const snapshot = snapshots[index]!;
    return { ...operation, ...snapshot, contextBefore: snapshot.before, contextAfter: snapshot.after };
  });
}

/** A model's label before and after a branch's pending operations on it. */
export interface ModelLabelChange {
  current: LanguageString;
  future: LanguageString;
}

/** Whether two language strings have the same value for every language tag. */
function languageStringsEqual(a: LanguageString, b: LanguageString): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((key) => a[key] === b[key]);
}

/**
 * The label of a model before and after a branch's pending operations on it,
 * resolved via {@link getModelMetadata} - the same source of truth the model
 * store itself uses to read a model's label off its main entity. Null when
 * the branch has no operations on the model, or its label does not change.
 */
export function branchModelLabelChange(modelStore: DefaultFrontendModelStore, branch: EvolutionBranch, modelId: string): ModelLabelChange | null {
  const modelType = modelTypesFromProjectModel(modelStore.getAllEntities()[modelStore.projectModelId] ?? {})[modelId];
  if (!modelType) return null;

  if (modelType === RDFS_MODEL) {
    const operations = branchOperationsByModel(branch).get(modelId);
    if (!operations || operations.length === 0) return null;

    const currentEntities = modelStore.getAllEntities()[modelId] ?? {};
    const current = getModelMetadata(modelType, currentEntities, modelId)?.label ?? {};

    const futureEntities = { ...currentEntities };
    applyToModel(futureEntities, operations, false, modelType);
    const future = getModelMetadata(modelType, futureEntities, modelId)?.label ?? {};

    return languageStringsEqual(current, future) ? null : { current, future };
  }

  const operations = branchOperationsByModel(branch).get(modelStore.projectModelId);
  if (!operations || operations.length === 0) return null;

  const currentEntities = modelStore.getAllEntities()[modelStore.projectModelId] ?? {};
  const current = (currentEntities[modelId] as ProjectModelEntity).label ?? {};

  const futureEntities = { ...currentEntities };
  applyToModel(futureEntities, operations, false, modelType);
  const future = (futureEntities[modelId] as ProjectModelEntity).label ?? {};

  return languageStringsEqual(current, future) ? null : { current, future };
}

/**
 * Deletes an evolution branch on the backend, discarding its pending
 * operations - the rollback of the evolution.
 */
export async function cancelEvolutionBranch(backendUrl: string, projectIri: string, branchId: number): Promise<void> {
  const url = new URL(`${backendUrl}/transactions/branches/${branchId}`, window.location.origin);
  url.searchParams.set("projectIri", projectIri);
  const response = await fetch(url.toString(), { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to delete evolution branch ${branchId}.`);
  }
}

export type EntityKind = "classes" | "relationships" | "generalizations" | "other";

export type EntityKindCounts = Record<EntityKind, number>;

export interface PendingChangeCounts {
  created: EntityKindCounts;
  modified: EntityKindCounts;
  deleted: EntityKindCounts;
}

function entityKind(entity: Entity): EntityKind {
  // Profile entities carry both the profile and the plain type, so the plain
  // guards match them as well.
  if (isSemanticModelClassProfile(entity) || isSemanticModelClass(entity)) return "classes";
  if (isSemanticModelRelationshipProfile(entity) || isSemanticModelRelationship(entity)) return "relationships";
  if (isSemanticModelGeneralization(entity)) return "generalizations";
  return "other";
}

/**
 * Summarizes the pending operations of a model as the net entity-level change
 * they cause — how many classes, relationships and generalizations get
 * created, modified and deleted. Computed from a diff of the model state
 * before and after the operations, as operations alone do not tell the kind of
 * the entity they delete.
 */
export function countPendingChanges(entities: EntityRecord, operations: Operation[]): PendingChangeCounts {
  const empty = (): EntityKindCounts => ({ classes: 0, relationships: 0, generalizations: 0, other: 0 });
  const counts: PendingChangeCounts = { created: empty(), modified: empty(), deleted: empty() };

  const after = { ...entities };
  applyOperationsToSemanticModel(after, operations);
  for (const change of diffEntities(entities, after)) {
    const action = change.previous === null ? "created" : change.next === null ? "deleted" : "modified";
    counts[action][entityKind((change.next ?? change.previous)!)]++;
  }
  return counts;
}

/**
 * Net pending change counts of a whole evolution branch, summed over the
 * semantic models its operations target. Operations targeting other kinds of
 * models (structure models, configuration blobs) are not counted.
 */
export function countBranchPendingChanges(models: Record<string, EntityRecord>, branch: EvolutionBranch): PendingChangeCounts {
  const empty = (): EntityKindCounts => ({ classes: 0, relationships: 0, generalizations: 0, other: 0 });
  const total: PendingChangeCounts = { created: empty(), modified: empty(), deleted: empty() };

  for (const [modelId, operations] of branchOperationsByModel(branch)) {
    const entities = models[modelId];
    if (!entities) continue;
    const counts = countPendingChanges(entities, operations);
    for (const action of ["created", "modified", "deleted"] as const) {
      for (const kind of Object.keys(total[action]) as EntityKind[]) {
        total[action][kind] += counts[action][kind];
      }
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Models and dependency edges
// ---------------------------------------------------------------------------

const SEMANTIC_MODEL_TYPES: string[] = [LOCAL_SEMANTIC_MODEL, RDFS_MODEL];

/**
 * Entity records of all semantic models (vocabularies and application
 * profiles) of the project, keyed by model id.
 */
export function semanticModelRecords(modelStore: DefaultFrontendModelStore): Record<string, EntityRecord> {
  const allEntities = modelStore.getAllEntities();
  const projectEntities = allEntities[modelStore.projectModelId] ?? {};

  const result: Record<string, EntityRecord> = {};
  for (const entity of Object.values(projectEntities)) {
    const projectEntity = entity as ProjectModelEntity;
    if (SEMANTIC_MODEL_TYPES.includes(projectEntity.modelType) && allEntities[projectEntity.id]) {
      result[projectEntity.id] = allEntities[projectEntity.id]!;
    }
  }
  return result;
}

/** A model is an application profile when it contains profile entities. */
export function isProfileModel(entities: EntityRecord): boolean {
  return Object.values(entities).some((entity) => isSemanticModelClassProfile(entity) || isSemanticModelRelationshipProfile(entity));
}

/** Ids of all entities the profile entities of the model profile. */
function profiledEntityIds(entities: EntityRecord): string[] {
  const ids = new Set<string>();
  for (const entity of Object.values(entities)) {
    if (isSemanticModelClassProfile(entity)) {
      entity.profiling.forEach((id) => ids.add(id));
    } else if (isSemanticModelRelationshipProfile(entity)) {
      entity.ends.forEach((end) => end.profiling.forEach((id) => ids.add(id)));
    }
  }
  return [...ids];
}

/** Ids of models the given model directly builds on (profiles entities of). */
function modelDependencies(models: Record<string, EntityRecord>, modelId: string): string[] {
  const referenced = profiledEntityIds(models[modelId] ?? {});
  return Object.keys(models).filter((id) => id !== modelId && referenced.some((entityId) => models[id]![entityId] !== undefined));
}

export type EvolutionEdgeKind = "semantic-to-profile" | "profile-to-profile";

/** One dependency edge affected by pending upstream changes. */
export interface EvolutionEdge {
  sourceModelId: string;
  targetModelId: string;
  kind: EvolutionEdgeKind;
}

/**
 * Dependency edges leading out of the given model — one per model that
 * profiles entities of it. The edge kind follows the nature of the source:
 * changes of a vocabulary and changes of an application profile are analyzed
 * differently.
 */
export function findEvolutionEdges(models: Record<string, EntityRecord>, sourceModelId: string): EvolutionEdge[] {
  const source = models[sourceModelId];
  if (!source) return [];
  const kind: EvolutionEdgeKind = isProfileModel(source) ? "profile-to-profile" : "semantic-to-profile";

  return Object.keys(models)
    .filter((targetModelId) => modelDependencies(models, targetModelId).includes(sourceModelId))
    .map((targetModelId) => ({ sourceModelId, targetModelId, kind }));
}

/**
 * Dependency edges affected by a branch: edges from every model the branch
 * changes to its dependents outside the branch. A branch is one atomic
 * upstream update (e.g. a package reload) — the models it changes are already
 * mutually consistent, so edges between two changed models need no review and
 * are omitted.
 */
export function findBranchEvolutionEdges(models: Record<string, EntityRecord>, branch: EvolutionBranch): EvolutionEdge[] {
  const changedModelIds = new Set(branch.operations.map(({ modelId }) => modelId));
  const edges: EvolutionEdge[] = [];
  for (const modelId of changedModelIds) {
    edges.push(...findEvolutionEdges(models, modelId).filter((edge) => !changedModelIds.has(edge.targetModelId)));
  }
  return edges;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function asEntityModel(entities: EntityRecord): EntityModel {
  return {
    getEntities: () => entities,
    subscribeToChanges: () => {},
    executeOperation: () => {},
  };
}

/**
 * Builds the aggregation hierarchy of a model bottom-up by following the
 * profiling references between models. A stand-in for the
 * configuration-driven builder of `@dataspecer/specification/model-hierarchy`,
 * which needs a package composition configuration these proof-of-concept
 * projects do not have.
 */
export function buildAggregatorForModel(models: Record<string, EntityRecord>, modelId: string, visited: Set<string> = new Set()): SemanticModelAggregator {
  const entities = models[modelId] ?? {};
  if (!isProfileModel(entities)) {
    return new VocabularyAggregator(asEntityModel(entities));
  }

  const nextVisited = new Set(visited).add(modelId);
  const sources = modelDependencies(models, modelId)
    .filter((id) => !nextVisited.has(id))
    .map((id) => buildAggregatorForModel(models, id, nextVisited));

  const source = sources.length === 1 ? sources[0]! : sources.length > 1 ? new MergeAggregator(sources) : new VocabularyAggregator(asEntityModel({}));

  return new ApplicationProfileAggregator(asEntityModel(entities), source, true);
}

/**
 * Effective (aggregated, inherited-value-resolved) entities of a review
 * group's target model — the same mechanism {@link OperationGroups} uses to
 * name entities of a package, via `getAggregatedEntitiesWithPassthroughForPackage`
 * / `build` — computed against a copy of every project model where the
 * group's upstream operations and the operations implied by the review
 * screen's current selections (checked create items, chosen decisions) are
 * both applied. This lets a field decision (e.g. a changed title) update the
 * derived names of other entities live, e.g. a relationship profile pointing
 * to the renamed class.
 */
export function effectiveGroupEntities(modelStore: DefaultFrontendModelStore, group: ReviewGroup, items: ReviewItem[], state: ReviewState): EntityRecord {
  const models = { ...modelStore.getAllEntities() };

  // The branch is one atomic upstream update — models other than the group's
  // own source may have pending changes too, and aggregation may depend on
  // them (e.g. a name several levels up the profiling chain).
  const operationsByModel = new Map<string, Operation[]>();
  for (const { modelId, operation } of group.branchOperations) {
    if (!operationsByModel.has(modelId)) operationsByModel.set(modelId, []);
    operationsByModel.get(modelId)!.push(operation);
  }
  for (const [modelId, operations] of operationsByModel) {
    models[modelId] = { ...(models[modelId] ?? {}) };
    applyOperationsToSemanticModel(models[modelId], operations);
  }

  const proposedOperations = collectGroupOperations(items, state, group);
  models[group.targetModelId] = { ...(models[group.targetModelId] ?? {}) };
  applyOperationsToSemanticModel(models[group.targetModelId], proposedOperations);

  return getAggregatedEntitiesWithPassthroughForPackage(models, group.targetModelId, new Map());
}

// ---------------------------------------------------------------------------
// Analysis
// ---------------------------------------------------------------------------

/**
 * Analyzes the pending operations of every evolution branch against the
 * dependents of the models it changes — one review group per dependency edge
 * leading out of the branch. Edges between two models changed by the same
 * branch are not analyzed: the branch is one atomic upstream update (e.g. a
 * package reload) whose models are already mutually consistent. A changed
 * model with no outside dependent still yields one group with an empty
 * analysis, so its upstream operations can be accepted. Snapshots of the
 * involved entity records are frozen inside the groups so the review stays
 * stable while changes are being applied.
 */
export function buildReviewGroups(modelStore: DefaultFrontendModelStore, branches: EvolutionBranch[], onlyBranchId?: number): ReviewGroup[] {
  const models = semanticModelRecords(modelStore);
  const groups: ReviewGroup[] = [];

  for (const branch of branches) {
    if (onlyBranchId !== undefined && branch.branchId !== onlyBranchId) continue;
    const byModel = branchOperationsByModel(branch);
    const changedModelIds = new Set(byModel.keys());

    for (const [sourceModelId, upstreamOperations] of byModel) {
      const upstreamBefore = models[sourceModelId];
      if (!upstreamBefore) continue;

      const edges = findEvolutionEdges(models, sourceModelId).filter((edge) => !changedModelIds.has(edge.targetModelId));
      if (edges.length === 0) {
        groups.push({
          branchId: branch.branchId,
          sourceModelId,
          targetModelId: sourceModelId,
          profileEntities: {},
          upstreamOperations,
          branchOperations: branch.operations,
          analysis: { upstreamBefore, upstreamAfter: upstreamBefore, items: [] },
        });
        continue;
      }

      for (const edge of edges) {
        const profileEntities = models[edge.targetModelId] ?? {};
        const analysis =
          edge.kind === "profile-to-profile"
            ? analyzeProfileEvolution({
                models,
                upstreamModelId: sourceModelId,
                operations: upstreamOperations,
                profileEntities,
                buildAggregator: (aggregatedModels) => buildAggregatorForModel(aggregatedModels, sourceModelId),
              })
            : analyzeEvolution(upstreamBefore, upstreamOperations, profileEntities);
        groups.push({
          branchId: branch.branchId,
          sourceModelId,
          targetModelId: edge.targetModelId,
          profileEntities,
          upstreamOperations,
          branchOperations: branch.operations,
          analysis,
        });
      }
    }
  }
  return groups;
}
