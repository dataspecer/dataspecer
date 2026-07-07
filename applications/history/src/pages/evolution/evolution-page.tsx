import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useModelStore } from "@/contexts/model-store-context";
import { OperationRenderer } from "./operations/operation-renderer";
import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { ProjectModelEntity } from "@dataspecer/project-model";
import { reactToSemanticModelOperation, type EvolutionProposal } from "@dataspecer/profile-model/hooks";
import type { Operation, OperationInModel } from "@dataspecer/core/operation";
import type { DefaultFrontendModelStore } from "@dataspecer/model-store/implementation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackendOperation {
  id: number;
  modelId: string;
  order: number;
  data: Operation;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

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
  const result = await response.json() as { branches: BranchInfo[] };
  return result.branches;
}

async function fetchBranchDiff(backendUrl: string, projectIri: string, branchId: number): Promise<BackendOperation[]> {
  const range = `main..[${branchId}]`;
  const url = new URL(`${backendUrl}/transactions/log/${encodeURIComponent(range)}`, window.location.origin);
  url.searchParams.set("projectIri", projectIri);
  const response = await fetch(url.toString());
  if (!response.ok) return [];
  const result = await response.json() as { transactions: { operations: BackendOperation[] }[] };
  return result.transactions.flatMap((tx) => tx.operations);
}

/**
 * Fetches pending operations from every evolution branch of the project (one
 * per model currently being updated), not just a single hardcoded branch, so
 * evolution can be reviewed for multiple models at once.
 */
async function fetchEvolutionOperations(backendUrl: string, projectIri: string): Promise<BackendOperation[]> {
  const branches = await fetchBranches(backendUrl, projectIri);
  const evolutionBranches = branches.filter((branch) => branch.resourceIri !== null);
  const operationsPerBranch = await Promise.all(
    evolutionBranches.map((branch) => fetchBranchDiff(backendUrl, projectIri, branch.id)),
  );
  return operationsPerBranch.flat();
}

// ---------------------------------------------------------------------------
// Model helpers
// ---------------------------------------------------------------------------

/**
 * Returns the id of the first LOCAL_SEMANTIC_MODEL in the project that is not
 * the given parent model.  This is the application profile model that will
 * receive the proposed evolution operations.
 */
function findChildModelId(modelStore: DefaultFrontendModelStore, parentModelId: string): string | null {
  const projectEntities = modelStore.getAllEntities()[modelStore.projectModelId] ?? {};
  return (
    Object.values(projectEntities)
      .filter((e): e is ProjectModelEntity => (e as ProjectModelEntity).modelType === LOCAL_SEMANTIC_MODEL)
      .find((e) => e.id !== parentModelId)
      ?.id ?? null
  );
}

/**
 * Derives evolution proposals for a single upstream operation using the
 * profile-model hook.  Returns an empty array when the parent or child model
 * cannot be resolved.
 */
function deriveProposals(modelStore: DefaultFrontendModelStore, op: BackendOperation): { proposals: EvolutionProposal[]; childModelId: string | null } {
  const parentEntities = modelStore.getAllEntities()[op.modelId];
  if (!parentEntities) return { proposals: [], childModelId: null };

  const childModelId = findChildModelId(modelStore, op.modelId);
  if (!childModelId) return { proposals: [], childModelId: null };

  const childEntities = modelStore.getAllEntities()[childModelId];
  if (!childEntities) return { proposals: [], childModelId: null };

  const proposals = reactToSemanticModelOperation(parentEntities, op.data, childEntities);
  return { proposals, childModelId };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ProposalCard({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-md border px-4 py-3 text-left text-sm transition-colors",
        selected
          ? "border-primary bg-primary/10 font-medium"
          : "border-border bg-muted/30 hover:bg-muted/60",
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Shows pending operations from all evolution branches of the project (one
 * per model currently being updated) one at a time. For each operation the
 * hook `reactToSemanticModelOperation` is called against the first child
 * LOCAL_SEMANTIC_MODEL found in the project.  The user picks a proposed
 * evolution operation (or none) and approves, which dispatches both the
 * upstream operation on the parent model and the selected proposal's
 * operations on the child model in a single model-store transaction.
 */
export function EvolutionPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const packageIri = (location.search as Record<string, unknown>).packageIri as string | undefined;
  const { modelStore } = useModelStore();

  const [operations, setOperations] = useState<BackendOperation[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  // Index into proposals array; -1 means "no evolution / skip child model"
  const [selectedProposalIdx, setSelectedProposalIdx] = useState<number>(-1);

  useEffect(() => {
    const backendUrl = import.meta.env.VITE_BACKEND as string | undefined;
    if (!backendUrl || !packageIri || !modelStore) return;

    setLoading(true);
    setIndex(0);
    fetchEvolutionOperations(backendUrl, packageIri)
      .then(setOperations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [packageIri, modelStore]);

  const current = operations[index];

  // Re-derive proposals whenever the current operation or the model store changes.
  const { proposals, childModelId } = useMemo(() => {
    if (!current || !modelStore) return { proposals: [], childModelId: null };
    return deriveProposals(modelStore, current);
  }, [current, modelStore]);

  // Auto-select the first proposal whenever the operation changes.
  useEffect(() => {
    setSelectedProposalIdx(proposals.length > 0 ? 0 : -1);
  }, [current?.id, proposals.length]);

  const total = operations.length;

  const handleApprove = () => {
    if (!modelStore || !current) return;

    const ops: OperationInModel[] = [
      { modelId: current.modelId, operation: current.data },
    ];

    if (selectedProposalIdx >= 0 && childModelId) {
      const proposal = proposals[selectedProposalIdx];
      for (const profileOp of proposal?.operations ?? []) {
        ops.push({ modelId: childModelId, operation: profileOp });
      }
    }

    modelStore.transaction(ops, {});
    setIndex((i) => i + 1);
  };

  const handleSkip = () => setIndex((i) => i + 1);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (!packageIri) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("evolution.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("evolution.description")}</p>
        </div>
        <p className="text-sm text-muted-foreground">{t("evolution.no-project")}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("evolution.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("evolution.description")}</p>
      </div>

      {total === 0 ? (
        <p className="text-sm text-muted-foreground">{t("evolution.empty")}</p>
      ) : index >= total ? (
        <div className="flex flex-col items-center gap-2 rounded-md border border-dashed p-10 text-center animate-in fade-in duration-300">
          <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("evolution.all-reviewed")}</p>
        </div>
      ) : (
        <>
          <div className="text-sm text-muted-foreground">
            {t("evolution.progress", { current: index + 1, total })}
          </div>

          {/* Upstream operation card */}
          <Card key={current.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <OperationRenderer operation={current.data} entities={modelStore?.getAllEntities()[current.modelId]} />
          </Card>

          {/* Evolution proposals */}
          {childModelId && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {proposals.length > 0
                  ? t("evolution.proposals-title")
                  : t("evolution.no-proposals")}
              </p>

              <div className="space-y-2">
                {proposals.map((proposal, i) => (
                  <ProposalCard
                    key={i}
                    label={proposal.label}
                    selected={selectedProposalIdx === i}
                    onClick={() => setSelectedProposalIdx(i)}
                  />
                ))}

                {/* Always show a "no evolution" option */}
                <ProposalCard
                  label={t("evolution.no-evolution")}
                  selected={selectedProposalIdx === -1}
                  onClick={() => setSelectedProposalIdx(-1)}
                />
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={handleSkip}>
              <SkipForward className="mr-1 h-4 w-4" />
              {t("evolution.skip")}
            </Button>
            <Button onClick={handleApprove}>
              {t("evolution.approve-and-continue")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
