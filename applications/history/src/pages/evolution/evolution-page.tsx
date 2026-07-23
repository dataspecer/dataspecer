import { OperationGroups } from "@/components/operation-row/operation-list";
import { Button } from "@/components/ui/button";
import { useModelStore } from "@/contexts/model-store-context";
import type { EntityRecord } from "@dataspecer/core/entity-model";
import type { OperationInModel } from "@dataspecer/core/operation";
import type { EvolutionItem } from "@dataspecer/profile-model/hooks";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, GitMerge } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { resolveModelDisplay } from "@/lib/model-display";
import { buildReviewGroups, cancelEvolutionBranch, effectiveGroupEntities, fetchEvolutionBranches, type EvolutionBranch } from "./evolution-data";
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
  type ReviewGroup,
  type ReviewState,
} from "./review-state";

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

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

  // The analysis is computed once from the fetched operations and the current
  // store state, then frozen — applying operations must not re-derive it.
  useEffect(() => {
    if (!backendUrl || !packageIri || !modelStore) return;

    setLoading(true);
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
      .catch(console.error)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [packageIri, branchId, modelStore]);

  const items = useMemo(() => buildReviewItems(groups ?? []), [groups]);

  // Recomputed on every state change: applies the operations implied by the
  // current selections to a shadow copy of each group's target model, so
  // entity names (e.g. of a proposed class profile, or one whose title a
  // decision is changing) stay live while the user fills out the form.
  const effectiveEntitiesByGroup = useMemo(() => {
    const map = new Map<ReviewGroup, EntityRecord>();
    if (!modelStore) return map;
    for (const group of groups ?? []) {
      map.set(group, effectiveGroupEntities(modelStore, group, items, state));
    }
    return map;
  }, [groups, items, state, modelStore]);

  const commit = useMemo(() => collectCommit(items, state), [items, state]);

  const statuses = useMemo(() => new Map(items.map((item) => [item.key, itemStatus(item, state)])), [items, state]);

  const upstreamOperations = useMemo(() => branches?.flatMap((branch) => branch.operations) ?? [], [branches]);

  const allDone = upstreamApplied && items.every((item) => statuses.get(item.key) === "applied" || statuses.get(item.key) === "unchecked");

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleCheck = (key: string, checked: boolean) => setState((s) => setItemChecked(items, s, key, checked));

  const handleSelectChoice = (key: string, decisionKey: string, choiceId: string) => setState((s) => selectChoice(items, s, key, decisionKey, choiceId));

  const handleManualDone = (key: string, done: boolean) => setState((s) => setManualDone(s, key, done));

  const handleApply = async () => {
    if (!modelStore || !branches) return;

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
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!packageIri) {
    return (
      <div className="space-y-4">
        <PageHeader packageIri={packageIri} sourceLabel={null} />
        <p className="text-sm text-muted-foreground">{t("evolution.no-project")}</p>
      </div>
    );
  }

  const sourceLabel = modelStore && branchId !== undefined && branches?.length ? resolveModelDisplay(modelStore, branches[0]!.resourceIri, i18n.language).name : null;

  if (loading || groups === null) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  const upstreamOperationCount = (branches ?? []).reduce((n, branch) => n + branch.operations.length, 0);
  const hasUpstreamOperations = upstreamOperationCount > 0;
  if (!hasUpstreamOperations) {
    return (
      <div className="space-y-4">
        <PageHeader packageIri={packageIri} sourceLabel={sourceLabel} />
        <p className="text-sm text-muted-foreground">{t("evolution.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader packageIri={packageIri} sourceLabel={sourceLabel} />

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
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
            <CheckCircle2 className="h-5 w-5" />
            {t("evolution.all-done")}
          </div>
        ) : (
          <Button onClick={handleApply} disabled={upstreamApplied && commit.operations.length === 0}>
            <GitMerge className="mr-1 h-4 w-4" />
            {upstreamApplied ? t("evolution.apply-selected", { count: commit.appliedMarks.length }) : t("evolution.apply-all", { count: commit.appliedMarks.length })}
          </Button>
        )}
      </div>

      {/* Upstream changes */}
      <section className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight text-muted-foreground uppercase">{t("evolution.upstream-changes")}</h2>
        <OperationGroups modelsBefore={modelStore?.getAllEntities() ?? {}} operations={upstreamOperations} />
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
                  state={state}
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

function PageHeader({ packageIri, sourceLabel }: { packageIri: string | undefined; sourceLabel: string | null }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1">
      {packageIri && (
        <Link to="/evolution" search={{ packageIri }} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" />
          {t("evolution.back-to-overview")}
        </Link>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{sourceLabel ? t("evolution.review-title", { name: sourceLabel }) : t("evolution.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("evolution.description")}</p>
    </div>
  );
}
