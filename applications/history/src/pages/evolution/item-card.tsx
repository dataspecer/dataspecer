import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EvolutionChoice, EvolutionFieldDecision, EvolutionSeverity } from "@dataspecer/profile-model/hooks";
import { ArrowRight, Check, CircleAlert, Link2Off, Trash2, Wrench } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LabelResolver } from "./display";
import { formatValue } from "./display";
import { ITEM_KEY, MANUAL_CHOICE, itemStatus, type ItemStatus, type ReviewItem, type ReviewState } from "./review-state";

export interface ItemCardProps {
  reviewItem: ReviewItem;
  state: ReviewState;
  labels: LabelResolver;
  onCheck: (key: string, checked: boolean) => void;
  onSelectChoice: (key: string, decisionKey: string, choiceId: string) => void;
  onManualDone: (key: string, done: boolean) => void;
}

export function ItemCard({ reviewItem, state, labels, onCheck, onSelectChoice, onManualDone }: ItemCardProps) {
  const { t } = useTranslation();
  const { key, item } = reviewItem;
  const itemState = state[key]!;
  const status = itemStatus(reviewItem, state);
  const locked = status === "applied";

  return (
    <Card className={cn("p-4 space-y-3", status === "applied" && "opacity-70", status === "unchecked" && "opacity-50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {isCreateItem(item.kind) && (
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-primary"
              checked={itemState.checked}
              disabled={locked}
              onChange={(e) => onCheck(key, e.target.checked)}
            />
          )}
          <div className="min-w-0">
            <ItemTitle reviewItem={reviewItem} labels={labels} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SeverityChip severity={item.severity} />
          <StatusBadge status={status} />
        </div>
      </div>

      {item.dependsOn.length > 0 && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Link2Off className="h-3 w-3" />
          {t("evolution.requires-new-profiles")}
        </p>
      )}

      {item.kind === "modify-profile" && (
        <div className="space-y-2">
          {item.decisions.map((decision) => (
            <DecisionRow
              key={decision.key}
              decision={decision}
              selectedChoiceId={itemState.choices[decision.key]!}
              applied={!!itemState.applied[decision.key]}
              labels={labels}
              onSelect={(choiceId) => onSelectChoice(key, decision.key, choiceId)}
            />
          ))}
        </div>
      )}

      {item.kind === "delete-profile" && (
        <div className="space-y-2">
          {(item.cascade.relationshipProfileIds.length > 0 || item.cascade.generalizationIds.length > 0) && (
            <p className="text-xs text-destructive flex items-center gap-1">
              <CircleAlert className="h-3 w-3 shrink-0" />
              {t("evolution.cascade-warning", {
                relationships: item.cascade.relationshipProfileIds.length,
                generalizations: item.cascade.generalizationIds.length,
              })}
            </p>
          )}
          <ChoiceButtons
            choices={item.choices}
            selectedChoiceId={itemState.choices[ITEM_KEY]!}
            disabled={locked}
            labels={labels}
            onSelect={(choiceId) => onSelectChoice(key, ITEM_KEY, choiceId)}
          />
        </div>
      )}

      {status === "manual" && (
        <label className="flex items-center gap-2 rounded-md border border-dashed border-violet-400/60 bg-violet-500/5 px-3 py-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={itemState.manualDone} onChange={(e) => onManualDone(key, e.target.checked)} />
          <span>{t("evolution.manual-todo")}</span>
        </label>
      )}
    </Card>
  );
}

function isCreateItem(kind: string): boolean {
  return kind.startsWith("create-");
}

// ---------------------------------------------------------------------------
// Title
// ---------------------------------------------------------------------------

function ItemTitle({ reviewItem, labels }: { reviewItem: ReviewItem; labels: LabelResolver }) {
  const { t } = useTranslation();
  const { item } = reviewItem;
  const sourceLabel = labels.source(item.source);

  switch (item.kind) {
    case "create-class-profile":
      return (
        <>
          <p className="text-sm font-medium">{t("evolution.item.create-class", { name: sourceLabel })}</p>
          <p className="text-xs text-muted-foreground">{t("evolution.item.create-class-hint")}</p>
        </>
      );
    case "create-relationship-profile":
      return (
        <>
          <p className="text-sm font-medium">{t("evolution.item.create-relationship", { name: sourceLabel })}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            {labels.profile(item.domainProfileId)}
            <ArrowRight className="h-3 w-3" />
            {labels.profile(item.rangeProfileId)}
          </p>
        </>
      );
    case "create-generalization-profile":
      return (
        <>
          <p className="text-sm font-medium">{t("evolution.item.create-generalization")}</p>
          <p className="text-xs text-muted-foreground">
            {t("evolution.item.specializes", {
              child: labels.profile(item.childProfileId),
              parent: labels.profile(item.parentProfileId),
            })}
          </p>
        </>
      );
    case "modify-profile":
      return (
        <>
          <p className="text-sm font-medium">{labels.profile(item.profileId)}</p>
          <p className="text-xs text-muted-foreground">{t("evolution.item.profile-of", { name: sourceLabel })}</p>
        </>
      );
    case "delete-profile":
      return (
        <>
          <p className="text-sm font-medium">{t(`evolution.item.deleted-${item.profileType}`, { name: sourceLabel })}</p>
          <p className="text-xs text-muted-foreground">{t("evolution.item.affected-profile", { name: labels.profile(item.profileId) })}</p>
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

function DecisionRow({
  decision,
  selectedChoiceId,
  applied,
  labels,
  onSelect,
}: {
  decision: EvolutionFieldDecision;
  selectedChoiceId: string;
  applied: boolean;
  labels: LabelResolver;
  onSelect: (choiceId: string) => void;
}) {
  const { t, i18n } = useTranslation();

  return (
    <div className={cn("rounded-md border px-3 py-2 space-y-2", applied && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium">
          {decision.endRole && `${t(`evolution.end-role.${decision.endRole}`)} · `}
          {t(`evolution.field.${decision.field}`)}
        </span>
        {decision.field === "concept" ? (
          <span className="text-muted-foreground text-xs">{t("evolution.retyped-upstream")}</span>
        ) : (
          <span className="flex items-center gap-1 text-muted-foreground">
            <span className="line-through decoration-muted-foreground/60">{formatValue(decision.oldValue, i18n.language)}</span>
            <ArrowRight className="h-3 w-3" />
            <span className="text-foreground">{formatValue(decision.newValue, i18n.language)}</span>
          </span>
        )}
        {applied && <Check className="h-3.5 w-3.5 text-green-600" />}
      </div>

      <p className="text-xs text-muted-foreground">
        {t(`evolution.profile-state.${decision.profileState}`, {
          value: formatValue(decision.profileValue, i18n.language),
        })}
      </p>

      <ChoiceButtons choices={decision.choices} selectedChoiceId={selectedChoiceId} disabled={applied} labels={labels} onSelect={onSelect} />
    </div>
  );
}

function ChoiceButtons({
  choices,
  selectedChoiceId,
  disabled,
  labels,
  onSelect,
}: {
  choices: EvolutionChoice[];
  selectedChoiceId: string;
  disabled: boolean;
  labels: LabelResolver;
  onSelect: (choiceId: string) => void;
}) {
  const { t } = useTranslation();

  const choiceLabel = (choice: EvolutionChoice): string => {
    if (choice.targetProfileId) {
      return t("evolution.choice.retarget", { name: labels.profile(choice.targetProfileId) });
    }
    return t(`evolution.choice.${choice.id}`);
  };

  const allChoices: { id: string; label: string; icon?: typeof Wrench }[] = [
    ...choices.map((choice) => ({
      id: choice.id,
      label: choiceLabel(choice),
      icon: choice.id === "delete" ? Trash2 : undefined,
    })),
    { id: MANUAL_CHOICE, label: t("evolution.choice.manual"), icon: Wrench },
  ];

  return (
    <div className="flex flex-wrap gap-1">
      {allChoices.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(id)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors disabled:cursor-not-allowed",
            selectedChoiceId === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 hover:bg-muted/70",
          )}
        >
          {Icon && <Icon className="mr-1 inline h-3 w-3" />}
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chips and badges
// ---------------------------------------------------------------------------

const severityStyles: Record<EvolutionSeverity, string> = {
  automatic: "border-green-500/40 text-green-700 dark:text-green-400",
  decision: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  attention: "border-red-500/40 text-red-700 dark:text-red-400",
};

function SeverityChip({ severity }: { severity: EvolutionSeverity }) {
  const { t } = useTranslation();
  return (
    <Badge variant="outline" className={severityStyles[severity]}>
      {t(`evolution.severity.${severity}`)}
    </Badge>
  );
}

function StatusBadge({ status }: { status: ItemStatus }) {
  const { t } = useTranslation();
  if (status === "pending" || status === "unchecked") return null;
  return (
    <Badge variant={status === "applied" ? "default" : "secondary"}>
      {status === "applied" && <Check className="mr-1 h-3 w-3" />}
      {status === "manual" && <Wrench className="mr-1 h-3 w-3" />}
      {t(`evolution.status.${status}`)}
    </Badge>
  );
}
