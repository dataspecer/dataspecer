import { OperationGroups } from "@/components/operation-row/operation-list";
import { ErrorBanner } from "@/components/error-banner";
import { Button } from "@/components/ui/button";
import { useModelStore } from "@/contexts/model-store-context";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { OperationInModel } from "@dataspecer/core/operation";
import type { EvolutionItem } from "@dataspecer/profile-model/hooks";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CheckCircle2, GitMerge } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { pickLanguageString, resolveModelDisplay } from "@/lib/model-display";
import { LOCAL_SEMANTIC_MODEL, RDFS_MODEL } from "@dataspecer/core-v2/model/known-models";
import {
  branchModelLabelChange,
  buildReviewGroups,
  cancelEvolutionBranch,
  effectiveGroupEntities,
  fetchEvolutionBranches,
  type EvolutionBranch,
  type ModelLabelChange,
} from "./evolution-data";
import { ItemCard } from "./item-card";
import {
  buildReviewItems,
  collectCommit,
  initializeState,
  itemStatus,
  markApplied,
  selectChoice,
  setItemChecked,
  setManualDone,
  type ItemState,
  type ReviewGroup,
  type ReviewItem,
  type ReviewState,
} from "./review-state";

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

/** Upstream changes to models other than these are pushed to the end and grayed out, as they are of little interest here. */
const IMPORTANT_MODEL_TYPES = [RDFS_MODEL, LOCAL_SEMANTIC_MODEL];

const SECTIONS: { id: string; kinds: EvolutionItem["kind"][] }[] = [
  { id: "new-classes", kinds: ["create-class-profile"] },
  { id: "new-relationships", kinds: ["create-relationship-profile"] },
  { id: "new-generalizations", kinds: ["create-generalization-profile"] },
  { id: "deletions", kinds: ["delete-profile"] },
  { id: "modifications", kinds: ["modify-profile"] },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Batch review of the pending evolution of one branch (or of every branch when
 * none is given) — one branch per reloaded resource, e.g. a whole package. The
 * pending operations are analyzed at once against every dependent profile
 * model outside the branch — vocabulary → profile and profile → profile edges
 * alike — and presented as one screen of decisions grouped into sections.
 * "Apply selected" commits all pending operations of the branch (first apply)
 * together with the profile operations of every resolved decision in a single
 * transaction; the screen stays open so remaining items — including those
 * marked to be resolved manually in the editor — keep their context.
 */
export function EvolutionPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const search = location.search as Record<string, unknown>;
  const packageIri = search.packageIri as string | undefined;
  const branchId = search.branch === undefined ? undefined : Number(search.branch);
  const { modelStore } = useModelStore();
  const backendUrl = import.meta.env.VITE_BACKEND as string | undefined;

  const [loading, setLoading] = useState(false);
  /** The reviewed evolution branches, frozen at fetch time. */
  const [branches, setBranches] = useState<EvolutionBranch[] | null>(null);
  const [groups, setGroups] = useState<ReviewGroup[] | null>(null);
  const [state, setState] = useState<ReviewState>({});
  const [upstreamApplied, setUpstreamApplied] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState(false);

  // The analysis is computed once from the fetched operations and the current
  // store state, then frozen — applying operations must not re-derive it.
  useEffect(() => {
    if (!backendUrl || !packageIri || !modelStore) return;

    setLoading(true);
    setLoadError(false);
    setBranches(null);
    setGroups(null);
    setUpstreamApplied(false);
    fetchEvolutionBranches(backendUrl, packageIri)
      .then((allBranches) => {
        const scoped = branchId === undefined ? allBranches : allBranches.filter((branch) => branch.branchId === branchId);
        const reviewGroups = buildReviewGroups(modelStore, scoped);
        setBranches(scoped);
        setGroups(reviewGroups);
        setState(initializeState(buildReviewItems(reviewGroups)));
      })
      .catch((error) => {
        console.error(error);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageIri, branchId, modelStore]);

  const items = useMemo(() => buildReviewItems(groups ?? []), [groups]);

  const itemsByGroup = useMemo(() => {
    const map = new Map<ReviewGroup, ReviewItem[]>();
    for (const item of items) map.set(item.group, [...(map.get(item.group) ?? []), item]);
    return map;
  }, [items]);

  /**
   * Per-group cache of `effectiveGroupEntities` (a nontrivial aggregation
   * over the group's target model). `setItemChecked`/`selectChoice`/etc.
   * shallow-copy `ReviewState`, so an item's own state object keeps the same
   * reference across an update unless it (or a dependency of it) was the one
   * that changed — comparing those references lets a group whose items were
   * untouched skip recomputation entirely instead of redoing it for every
   * group on every keystroke/click anywhere on the page.
   */
  const effectiveEntitiesCache = useRef(new Map<ReviewGroup, { itemStates: ItemState[]; entities: EntityRecord }>());

  const effectiveEntitiesByGroup = useMemo(() => {
    const map = new Map<ReviewGroup, EntityRecord>();
    if (!modelStore) return map;
    for (const group of groups ?? []) {
      const itemStates = (itemsByGroup.get(group) ?? []).map((item) => state[item.key]!);
      const cached = effectiveEntitiesCache.current.get(group);
      const unchanged = !!cached && cached.itemStates.length === itemStates.length && cached.itemStates.every((s, i) => s === itemStates[i]);
      const entities = unchanged ? cached!.entities : effectiveGroupEntities(modelStore, group, items, state);
      if (!unchanged) effectiveEntitiesCache.current.set(group, { itemStates, entities });
      map.set(group, entities);
    }
    return map;
  }, [groups, items, itemsByGroup, state, modelStore]);

  const commit = useMemo(() => collectCommit(items, state), [items, state]);

  const statuses = useMemo(() => new Map(items.map((item) => [item.key, itemStatus(item, state[item.key]!)])), [items, state]);

  const upstreamOperations = useMemo(() => branches?.flatMap((branch) => branch.operations) ?? [], [branches]);

  const modelsBefore = useMemo(() => modelStore?.getAllEntities() ?? {}, [modelStore]);

  const allDone = upstreamApplied && items.every((item) => statuses.get(item.key) === "applied" || statuses.get(item.key) === "unchecked");

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleCheck = useCallback((key: string, checked: boolean) => setState((s) => setItemChecked(items, s, key, checked)), [items]);

  const handleSelectChoice = useCallback(
    (key: string, decisionKey: string, choiceId: string) => setState((s) => selectChoice(items, s, key, decisionKey, choiceId)),
    [items],
  );

  const handleManualDone = useCallback((key: string, done: boolean) => setState((s) => setManualDone(s, key, done)), []);

  const handleApply = async () => {
    if (!modelStore || !branches || applying) return;

    const operations: OperationInModel[] = [];
    if (!upstreamApplied) {
      // The upstream changes are not negotiable — the upstream models moved to
      // a new version; all pending operations of the reviewed branches
      // (including those targeting models without dependents, e.g. structure
      // models of a reloaded package) are committed wholesale with the first
      // apply.
      for (const branch of branches) {
        operations.push(...branch.operations);
      }
    }
    operations.push(...commit.operations);
    if (operations.length === 0) return;

    setApplying(true);
    setApplyError(false);
    try {
    await modelStore.transaction(operations, {}).confirmation;

    if (!upstreamApplied && backendUrl && packageIri) {
      // The committed upstream operations made the evolution branches
      // obsolete — delete them, like skipping does on the overview page. The
      // review keeps working from its frozen snapshots until the page is left.
      for (const branch of branches) {
        cancelEvolutionBranch(backendUrl, packageIri, branch.branchId).catch(console.error);
      }
    }
    setState((s) => markApplied(s, commit.appliedMarks));
    setUpstreamApplied(true);
    } catch (error) {
      console.error(error);
      setApplyError(true);
    } finally {
      setApplying(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!packageIri) {
    return (
      <div className="space-y-4">
        <PageHeader packageIri={packageIri} sourceLabel={null} labelChange={null} />
        <p className="text-sm text-muted-foreground">{t("evolution.no-project")}</p>
      </div>
    );
  }

  const reviewedBranch = modelStore && branchId !== undefined ? branches?.[0] : undefined;
  const sourceLabel = reviewedBranch && modelStore ? resolveModelDisplay(modelStore, reviewedBranch.resourceIri, i18n.language).name : null;
  const sourceLabelChange = reviewedBranch && modelStore ? branchModelLabelChange(modelStore, reviewedBranch, reviewedBranch.resourceIri) : null;

  if (loading || groups === null) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <PageHeader packageIri={packageIri} sourceLabel={sourceLabel} labelChange={sourceLabelChange} />
        <ErrorBanner message={t("evolution.error.load")} />
      </div>
    );
  }

  const upstreamOperationCount = (branches ?? []).reduce((n, branch) => n + branch.operations.length, 0);
  const hasUpstreamOperations = upstreamOperationCount > 0;
  if (!hasUpstreamOperations) {
    return (
      <div className="space-y-4">
        <PageHeader packageIri={packageIri} sourceLabel={sourceLabel} labelChange={sourceLabelChange} />
        <p className="text-sm text-muted-foreground">{t("evolution.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader packageIri={packageIri} sourceLabel={sourceLabel} labelChange={sourceLabelChange} />

      {applyError && <ErrorBanner message={t("evolution.error.apply")} />}

      {/* Summary */}
      <div className="sticky top-20 z-10 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/95 px-4 py-3 shadow-sm backdrop-blur-sm supports-backdrop-filter:bg-background/80">
        <div className="text-sm">
          <p className="font-medium">
            {t("evolution.summary", {
              operations: upstreamOperationCount,
              proposed: items.length,
            })}
          </p>
        </div>
        {allDone ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              {t("evolution.all-done")}
            </div>
            <Button asChild size="sm" variant="outline">
              <a href={import.meta.env.VITE_MANAGER_URL ?? "/"}>{t("evolution.back-to-manager")}</a>
            </Button>
          </div>
        ) : (
          <Button onClick={handleApply} disabled={applying || (upstreamApplied && commit.operations.length === 0)}>
            <GitMerge className="mr-1 h-4 w-4" />
            {upstreamApplied ? t("evolution.apply-selected", { count: commit.appliedMarks.length }) : t("evolution.apply-all", { count: commit.appliedMarks.length })}
          </Button>
        )}
      </div>

      {/* Upstream changes */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">{t("evolution.upstream-changes")}</h2>
        <OperationGroups modelsBefore={modelsBefore} operations={upstreamOperations} importantModelTypes={IMPORTANT_MODEL_TYPES} />
      </section>

      {items.length === 0 && <p className="text-sm text-muted-foreground">{t("evolution.no-profile-impact")}</p>}

      {/* Sections */}
      {SECTIONS.map((section) => {
        const sectionItems = items.filter((item) => section.kinds.includes(item.item.kind));
        if (sectionItems.length === 0) return null;
        return (
          <section key={section.id} className="space-y-2">
            <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">
              {t(`evolution.section.${section.id}`)} ({sectionItems.length})
            </h2>
            <div className="space-y-2">
              {sectionItems.map((reviewItem) => (
                <ItemCard
                  key={reviewItem.key}
                  reviewItem={reviewItem}
                  itemState={state[reviewItem.key]!}
                  effectiveEntities={effectiveEntitiesByGroup.get(reviewItem.group) ?? reviewItem.group.profileEntities}
                  onCheck={handleCheck}
                  onSelectChoice={handleSelectChoice}
                  onManualDone={handleManualDone}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PageHeader({
  packageIri,
  sourceLabel,
  labelChange,
}: {
  packageIri: string | undefined;
  sourceLabel: string | null;
  labelChange: ModelLabelChange | null;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="space-y-1">
      {packageIri && (
        <Link to="/evolution" search={{ packageIri }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          {t("evolution.back-to-overview")}
        </Link>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">
        {sourceLabel ? (
          <Trans i18nKey="evolution.review-title" components={{ name: <ReviewTitleName sourceLabel={sourceLabel} labelChange={labelChange} language={i18n.language} /> }} />
        ) : (
          t("evolution.title")
        )}
      </h1>
      <p className="text-sm text-muted-foreground">{t("evolution.description")}</p>
    </div>
  );
}

/** The reviewed model's name in the page title — both its current and future label when the pending operations rename it. */
function ReviewTitleName({ sourceLabel, labelChange, language }: { sourceLabel: string; labelChange: ModelLabelChange | null; language: string }) {
  if (!labelChange) return <>{sourceLabel}</>;
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground line-through decoration-muted-foreground/60">{pickLanguageString(labelChange.current, language) ?? sourceLabel}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
      <span>{pickLanguageString(labelChange.future, language) ?? sourceLabel}</span>
    </span>
  );
}
