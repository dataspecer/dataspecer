import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { Operation, OperationInModel } from "@dataspecer/core/operation";
import type { EvolutionAnalysis, EvolutionItem } from "@dataspecer/profile-model/hooks";

/**
 * Pure state logic of the evolution review screen: which items are checked,
 * which choice is selected per decision, what has already been committed, and
 * the dependency propagation between items ("smart switches").
 */

/** Choice id for "I will resolve this manually in the editor". */
export const MANUAL_CHOICE = "manual";

/** Pseudo decision key for items that carry a single choice or none. */
export const ITEM_KEY = "$item";

/** One dependency edge under review: an upstream model and a dependent model. */
export interface ReviewGroup {
  /** Evolution branch the reviewed operations come from. */
  branchId: number;
  /** Upstream model whose pending operations are being reviewed. */
  sourceModelId: string;
  /** Profile model receiving the proposed evolution operations. */
  targetModelId: string;
  /** Snapshot of the profile entities at analysis time, used for labels. */
  profileEntities: EntityRecord;
  /** The pending upstream operations, in backend order. */
  upstreamOperations: Operation[];
  analysis: EvolutionAnalysis;
}

/** An evolution item with a globally unique key (unique across groups). */
export interface ReviewItem {
  key: string;
  group: ReviewGroup;
  item: EvolutionItem;
}

export interface ItemState {
  /** For create items: whether the user wants to apply the item at all. */
  checked: boolean;
  /** Selected choice id per decision key ({@link ITEM_KEY} for delete items). */
  choices: Record<string, string>;
  /** Decision keys whose operations have already been committed. */
  applied: Record<string, boolean>;
  /** The user ticked off a manually resolved item. */
  manualDone: boolean;
}

export type ReviewState = Record<string, ItemState>;

export type ItemStatus = "pending" | "applied" | "manual" | "unchecked";

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

/** Identifies one review group (dependency edge) among all groups. */
export function groupKey(group: ReviewGroup): string {
  return `${group.branchId}|${group.sourceModelId}|${group.targetModelId}`;
}

export function itemKey(group: ReviewGroup, itemId: string): string {
  return `${groupKey(group)}|${itemId}`;
}

export function buildReviewItems(groups: ReviewGroup[]): ReviewItem[] {
  return groups.flatMap((group) => group.analysis.items.map((item) => ({ key: itemKey(group, item.id), group, item })));
}

export function initializeState(items: ReviewItem[]): ReviewState {
  const state: ReviewState = {};
  for (const { key, item } of items) {
    const choices: Record<string, string> = {};
    if (item.kind === "modify-profile") {
      for (const decision of item.decisions) {
        choices[decision.key] = decision.defaultChoiceId;
      }
    } else if (item.kind === "delete-profile") {
      choices[ITEM_KEY] = item.defaultChoiceId;
    }
    state[key] = { checked: true, choices, applied: {}, manualDone: false };
  }
  return state;
}

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

/** Keys of items the given item directly depends on. */
function dependencyKeys(reviewItem: ReviewItem): string[] {
  return reviewItem.item.dependsOn.map((id) => itemKey(reviewItem.group, id));
}

/**
 * Checks or unchecks a create item. Checking transitively checks everything it
 * depends on; unchecking transitively unchecks everything depending on it and
 * resets decision choices that depend on an unchecked item to their default.
 */
export function setItemChecked(items: ReviewItem[], state: ReviewState, key: string, checked: boolean): ReviewState {
  const byKey = new Map(items.map((i) => [i.key, i]));
  const next: ReviewState = { ...state };

  const check = (k: string) => {
    const reviewItem = byKey.get(k);
    if (!reviewItem || next[k]?.checked) return;
    next[k] = { ...next[k]!, checked: true };
    for (const dep of dependencyKeys(reviewItem)) check(dep);
  };

  const uncheck = (k: string) => {
    if (!next[k]?.checked) return;
    next[k] = { ...next[k]!, checked: false };
    for (const other of items) {
      if (dependencyKeys(other).includes(k)) uncheck(other.key);
    }
    resetChoicesDependingOn(items, next, k);
  };

  if (checked) check(key);
  else uncheck(key);
  return next;
}

/**
 * Resets selected choices that require the (now unchecked) item back to the
 * decision default.
 */
function resetChoicesDependingOn(items: ReviewItem[], state: ReviewState, uncheckedKey: string): void {
  for (const reviewItem of items) {
    if (reviewItem.item.kind !== "modify-profile") continue;
    const itemState = state[reviewItem.key]!;
    for (const decision of reviewItem.item.decisions) {
      const selected = decision.choices.find((c) => c.id === itemState.choices[decision.key]);
      const dependsOnUnchecked = selected?.dependsOn?.some((id) => itemKey(reviewItem.group, id) === uncheckedKey) ?? false;
      if (dependsOnUnchecked) {
        state[reviewItem.key] = {
          ...state[reviewItem.key]!,
          choices: { ...state[reviewItem.key]!.choices, [decision.key]: decision.defaultChoiceId },
        };
      }
    }
  }
}

/**
 * Selects a choice for a decision. When the choice depends on other items
 * (e.g. retarget to a class profile that is only proposed), those get checked.
 */
export function selectChoice(items: ReviewItem[], state: ReviewState, key: string, decisionKey: string, choiceId: string): ReviewState {
  const reviewItem = items.find((i) => i.key === key);
  if (!reviewItem) return state;

  let next: ReviewState = {
    ...state,
    [key]: { ...state[key]!, choices: { ...state[key]!.choices, [decisionKey]: choiceId } },
  };

  const choice = findChoice(reviewItem.item, decisionKey, choiceId);
  for (const dependencyId of choice?.dependsOn ?? []) {
    next = setItemChecked(items, next, itemKey(reviewItem.group, dependencyId), true);
  }
  return next;
}

function findChoice(item: EvolutionItem, decisionKey: string, choiceId: string) {
  if (item.kind === "modify-profile") {
    return item.decisions.find((d) => d.key === decisionKey)?.choices.find((c) => c.id === choiceId);
  }
  if (item.kind === "delete-profile") {
    return item.choices.find((c) => c.id === choiceId);
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export function itemStatus(reviewItem: ReviewItem, state: ReviewState): ItemStatus {
  const itemState = state[reviewItem.key]!;
  const item = reviewItem.item;

  if (item.kind === "modify-profile") {
    const done = (decisionKey: string) => itemState.applied[decisionKey] || (itemState.choices[decisionKey] === MANUAL_CHOICE && itemState.manualDone);
    if (item.decisions.every((d) => done(d.key))) return "applied";
    const manualOpen = item.decisions.some((d) => itemState.choices[d.key] === MANUAL_CHOICE && !itemState.manualDone);
    const pendingAutomatic = item.decisions.some((d) => itemState.choices[d.key] !== MANUAL_CHOICE && !itemState.applied[d.key]);
    return manualOpen && !pendingAutomatic ? "manual" : "pending";
  }

  if (item.kind === "delete-profile") {
    if (itemState.applied[ITEM_KEY]) return "applied";
    if (itemState.choices[ITEM_KEY] === MANUAL_CHOICE) {
      return itemState.manualDone ? "applied" : "manual";
    }
    return "pending";
  }

  // Create items.
  if (itemState.applied[ITEM_KEY]) return "applied";
  return itemState.checked ? "pending" : "unchecked";
}

// ---------------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------------

/** Order in which profile operations are safe to execute within a commit. */
const COMMIT_ORDER: Record<EvolutionItem["kind"], number> = {
  "create-class-profile": 0,
  "create-relationship-profile": 1,
  "create-generalization-profile": 1,
  "modify-profile": 2,
  "delete-profile": 3,
};

export interface CollectedCommit {
  operations: OperationInModel[];
  /** (item key, decision key) pairs to mark as applied on success. */
  appliedMarks: { key: string; decisionKey: string }[];
}

/**
 * Collects the profile operations of everything that is selected, resolvable
 * (dependencies applied or included in this very commit) and not yet applied.
 */
export function collectCommit(items: ReviewItem[], state: ReviewState): CollectedCommit {
  const operations: OperationInModel[] = [];
  const appliedMarks: { key: string; decisionKey: string }[] = [];

  const isItemAvailable = (key: string): boolean => {
    // A dependency is satisfiable when it is already applied or checked (and
    // thus included in this commit — creates always sort first).
    const dependencyState = state[key];
    return !!dependencyState && (dependencyState.applied[ITEM_KEY] || dependencyState.checked);
  };

  const sorted = [...items].sort((a, b) => COMMIT_ORDER[a.item.kind] - COMMIT_ORDER[b.item.kind]);

  for (const reviewItem of sorted) {
    const { key, group, item } = reviewItem;
    const itemState = state[key]!;
    const push = (ops: Operation[], decisionKey: string) => {
      operations.push(...ops.map((operation) => ({ modelId: group.targetModelId, operation })));
      appliedMarks.push({ key, decisionKey });
    };

    if (item.kind === "modify-profile") {
      for (const decision of item.decisions) {
        if (itemState.applied[decision.key]) continue;
        const choiceId = itemState.choices[decision.key];
        if (choiceId === MANUAL_CHOICE) continue;
        const choice = decision.choices.find((c) => c.id === choiceId);
        if (!choice) continue;
        const dependenciesOk = (choice.dependsOn ?? []).every((id) => isItemAvailable(itemKey(group, id)));
        if (!dependenciesOk) continue;
        push(choice.operations, decision.key);
      }
    } else if (item.kind === "delete-profile") {
      if (itemState.applied[ITEM_KEY]) continue;
      const choiceId = itemState.choices[ITEM_KEY];
      if (choiceId === MANUAL_CHOICE) continue;
      const choice = item.choices.find((c) => c.id === choiceId);
      if (choice) push(choice.operations, ITEM_KEY);
    } else {
      // Create items.
      if (itemState.applied[ITEM_KEY] || !itemState.checked) continue;
      const dependenciesOk = item.dependsOn.every((id) => isItemAvailable(itemKey(group, id)));
      if (!dependenciesOk) continue;
      push(item.operations, ITEM_KEY);
    }
  }

  return { operations, appliedMarks };
}

export function markApplied(state: ReviewState, marks: { key: string; decisionKey: string }[]): ReviewState {
  const next = { ...state };
  for (const { key, decisionKey } of marks) {
    next[key] = { ...next[key]!, applied: { ...next[key]!.applied, [decisionKey]: true } };
  }
  return next;
}

export function setManualDone(state: ReviewState, key: string, done: boolean): ReviewState {
  return { ...state, [key]: { ...state[key]!, manualDone: done } };
}
