import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useModelStore } from "@/contexts/model-store-context";
import { resolveModelDisplay } from "@/lib/model-display";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, SkipForward, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  cancelEvolutionBranch,
  countBranchPendingChanges,
  fetchEvolutionBranches,
  findBranchEvolutionEdges,
  semanticModelRecords,
  type EvolutionBranch,
  type EvolutionEdge,
  type PendingChangeCounts,
} from "./evolution-data";

interface PendingBranchRow {
  branch: EvolutionBranch;
  counts: PendingChangeCounts;
  edges: EvolutionEdge[];
}

/**
 * Landing page of the evolution: lists every pending evolution branch — one
 * per reloaded resource, so a package reload appears as a single pending
 * evolution even when it changed several models inside the package — the
 * dependency edges the changes flow along to models outside the branch
 * (vocabulary → profile or profile → profile), and links to the review screen
 * of each branch. Besides the review, an evolution can be skipped (upstream
 * changes are accepted without any reaction in the dependent models) or
 * cancelled (the evolution branch is discarded).
 */
export function EvolutionOverviewPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const packageIri = (location.search as Record<string, unknown>).packageIri as string | undefined;
  const { modelStore } = useModelStore();
  const backendUrl = import.meta.env.VITE_BACKEND as string | undefined;

  const [loading, setLoading] = useState(false);
  const [branches, setBranches] = useState<EvolutionBranch[] | null>(null);
  /** Branch id whose skip/cancel action is currently running. */
  const [busyBranchId, setBusyBranchId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (!backendUrl || !packageIri || !modelStore) return;
    setLoading(true);
    setBranches(null);
    fetchEvolutionBranches(backendUrl, packageIri)
      .then(setBranches)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [backendUrl, packageIri, modelStore]);

  useEffect(refresh, [refresh]);

  const rows = useMemo<PendingBranchRow[]>(() => {
    if (!branches || !modelStore) return [];
    const models = semanticModelRecords(modelStore);

    return branches
      .filter((branch) => branch.operations.length > 0)
      .map((branch) => ({
        branch,
        counts: countBranchPendingChanges(models, branch),
        edges: findBranchEvolutionEdges(models, branch),
      }));
  }, [branches, modelStore]);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  /** Discards the evolution branch of the row without touching any model. */
  const handleCancel = async (row: PendingBranchRow) => {
    if (!backendUrl || !packageIri) return;
    setBusyBranchId(row.branch.branchId);
    try {
      await cancelEvolutionBranch(backendUrl, packageIri, row.branch.branchId);
      refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setBusyBranchId(null);
    }
  };

  /**
   * Accepts the upstream changes as they are — commits them to the models and
   * discards the evolution branch — without any reaction in the dependent
   * models.
   */
  const handleSkip = async (row: PendingBranchRow) => {
    if (!backendUrl || !packageIri || !modelStore) return;
    setBusyBranchId(row.branch.branchId);
    try {
      modelStore.transaction(row.branch.operations, {});
      await cancelEvolutionBranch(backendUrl, packageIri, row.branch.branchId);
      refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setBusyBranchId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!packageIri) {
    return (
      <div className="space-y-4">
        <PageHeader />
        <p className="text-sm text-muted-foreground">{t("evolution.no-project")}</p>
      </div>
    );
  }

  if (loading || branches === null || !modelStore) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      {rows.length === 0 && <p className="text-sm text-muted-foreground">{t("evolution.overview.empty")}</p>}

      <div className="space-y-3">
        {rows.map((row) => {
          const source = resolveModelDisplay(modelStore, row.branch.resourceIri, i18n.language);
          const SourceIcon = source.icon;
          return (
          <Card key={row.branch.branchId} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <SourceIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate font-medium">{source.name ?? t(`model-type.${source.typeKey}`)}</span>
                  {source.name !== null && <span className="text-xs text-muted-foreground">{t(`model-type.${source.typeKey}`)}</span>}
                  <Badge variant="destructive">{t("evolution.overview.status.not-in-specification")}</Badge>
                </div>
                <PendingChangesSummary counts={row.counts} />
                {row.edges.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("evolution.overview.no-targets")}</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{t("evolution.overview.affects")}</span>
                    {row.edges.map((edge) => {
                      const target = resolveModelDisplay(modelStore, edge.targetModelId, i18n.language);
                      const TargetIcon = target.icon;
                      return (
                        <Badge key={`${edge.sourceModelId}|${edge.targetModelId}`} variant="outline" className="gap-1 font-normal">
                          <TargetIcon className="h-3 w-3" />
                          {target.name ?? t(`model-type.${target.typeKey}`)}
                          <span className="text-muted-foreground">· {t(`evolution.overview.edge.${edge.kind}`)}</span>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center">
                <Button asChild size="sm" className="rounded-r-none" disabled={busyBranchId !== null}>
                  <Link to="/evolution/review" search={{ packageIri, branch: row.branch.branchId }}>
                    {t("evolution.overview.review")}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="rounded-l-none border-l border-primary-foreground/20 px-1.5" disabled={busyBranchId !== null}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuItem className="items-start gap-2" onClick={() => handleSkip(row)}>
                      <SkipForward className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{t("evolution.overview.action.skip")}</span>
                        <span className="text-xs text-muted-foreground">{t("evolution.overview.action.skip-description")}</span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="items-start gap-2" onClick={() => handleCancel(row)}>
                      <Undo2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{t("evolution.overview.action.cancel")}</span>
                        <span className="text-xs text-muted-foreground">{t("evolution.overview.action.cancel-description")}</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
}

const CHANGE_ACTIONS = ["created", "modified", "deleted"] as const;
const ENTITY_KINDS = ["classes", "relationships", "generalizations", "other"] as const;

/**
 * One line like "Created: 2 classes, 1 relationship · Deleted: 1
 * generalization" — only nonzero segments are shown.
 */
function PendingChangesSummary({ counts }: { counts: PendingChangeCounts }) {
  const { t } = useTranslation();

  const parts = CHANGE_ACTIONS.map((action) => {
    const kinds = ENTITY_KINDS.filter((kind) => counts[action][kind] > 0).map((kind) => t(`evolution.overview.kind.${kind}`, { count: counts[action][kind] }));
    return kinds.length === 0 ? null : `${t(`evolution.overview.change.${action}`)}: ${kinds.join(", ")}`;
  }).filter((part) => part !== null);

  return <p className="text-xs text-muted-foreground">{parts.length > 0 ? parts.join(" · ") : t("evolution.overview.no-net-changes")}</p>;
}

function PageHeader() {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t("evolution.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("evolution.overview.description")}</p>
    </div>
  );
}
