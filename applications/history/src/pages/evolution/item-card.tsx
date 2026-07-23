import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LanguageString } from "@dataspecer/core-v2/semantic-model/concepts";
import type { EvolutionChoice, EvolutionFieldDecision } from "@dataspecer/profile-model/hooks";
import { ArrowRight, Check, CircleAlert, Link2Off, Trash2, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { ProfileName, SourceName } from "./display";
import { ITEM_KEY, MANUAL_CHOICE, itemStatus, type ItemStatus, type ReviewGroup, type ReviewItem, type ReviewState } from "./review-state";

export interface ItemCardProps {
  reviewItem: ReviewItem;
  state: ReviewState;
  onCheck: (key: string, checked: boolean) => void;
  onSelectChoice: (key: string, decisionKey: string, choiceId: string) => void;
  onManualDone: (key: string, done: boolean) => void;
}

export function ItemCard({ reviewItem, state, onCheck, onSelectChoice, onManualDone }: ItemCardProps) {
  const { t } = useTranslation();
  const { key, group, item } = reviewItem;
  const itemState = state[key]!;
  const status = itemStatus(reviewItem, state);
  const locked = status === "applied";

  return (
    <Card className={cn("p-4 space-y-3", status === "applied" && "opacity-70")}>
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
            <ItemTitle reviewItem={reviewItem} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
              group={group}
              decision={decision}
              selectedChoiceId={itemState.choices[decision.key]!}
              applied={!!itemState.applied[decision.key]}
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
            group={group}
            choices={item.choices}
            selectedChoiceId={itemState.choices[ITEM_KEY]!}
            disabled={locked}
            onSelect={(choiceId) => onSelectChoice(key, ITEM_KEY, choiceId)}
          />
        </div>
      )}

      {/* Stays visible once ticked so an accidental tick can be undone. */}
      {(status === "manual" || itemState.manualDone) && (
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

function ItemTitle({ reviewItem }: { reviewItem: ReviewItem }) {
  const { t } = useTranslation();
  const { group, item } = reviewItem;
  const sourceName = <SourceName group={group} source={item.source} />;

  switch (item.kind) {
    case "create-class-profile":
      return (
        <>
          <p className="text-sm font-medium">
            <Trans i18nKey="evolution.item.create-class" components={{ name: sourceName }} />
          </p>
          <p className="text-xs text-muted-foreground">{t("evolution.item.create-class-hint")}</p>
        </>
      );
    case "create-relationship-profile":
      return (
        <>
          <p className="text-sm font-medium">
            <Trans i18nKey="evolution.item.create-relationship" components={{ name: sourceName }} />
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <ProfileName group={group} profileId={item.domainProfileId} />
            <ArrowRight className="h-3 w-3" />
            <ProfileName group={group} profileId={item.rangeProfileId} />
          </p>
        </>
      );
    case "create-generalization-profile":
      return (
        <>
          <p className="text-sm font-medium">{t("evolution.item.create-generalization")}</p>
          <p className="text-xs text-muted-foreground">
            <Trans
              i18nKey="evolution.item.specializes"
              components={{
                child: <ProfileName group={group} profileId={item.childProfileId} />,
                parent: <ProfileName group={group} profileId={item.parentProfileId} />,
              }}
            />
          </p>
        </>
      );
    case "modify-profile":
      return (
        <>
          <p className="text-sm font-medium">
            <ProfileName group={group} profileId={item.profileId} />
          </p>
          <p className="text-xs text-muted-foreground">
            <Trans i18nKey="evolution.item.profile-of" components={{ name: sourceName }} />
          </p>
        </>
      );
    case "delete-profile":
      return (
        <>
          <p className="text-sm font-medium">
            <Trans i18nKey={`evolution.item.deleted-${item.profileType}`} components={{ name: sourceName }} />
          </p>
          <p className="text-xs text-muted-foreground">
            <Trans i18nKey="evolution.item.affected-profile" components={{ name: <ProfileName group={group} profileId={item.profileId} /> }} />
          </p>
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

function DecisionRow({
  group,
  decision,
  selectedChoiceId,
  applied,
  onSelect,
}: {
  group: ReviewGroup;
  decision: EvolutionFieldDecision;
  selectedChoiceId: string;
  applied: boolean;
  onSelect: (choiceId: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className={cn("rounded-md border px-3 py-2 space-y-2", applied && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        <span className="font-medium">
          {decision.endRole && `${t(`evolution.end-role.${decision.endRole}`)} · `}
          {t(`evolution.field.${decision.field}`)}
        </span>
        <UpstreamDiff decision={decision} />
        {applied && <Check className="h-3.5 w-3.5 text-green-600" />}
      </div>

      <p className="text-xs text-muted-foreground">
        <Trans
          i18nKey={`evolution.profile-state.${decision.profileState}`}
          components={{ value: <ProfileValue group={group} decision={decision} /> }}
        />
      </p>

      <ChoiceButtons group={group} choices={decision.choices} selectedChoiceId={selectedChoiceId} disabled={applied} onSelect={onSelect} />
    </div>
  );
}

/** The upstream old → new change of the decided field. */
function UpstreamDiff({ decision }: { decision: EvolutionFieldDecision }) {
  const { t } = useTranslation();
  switch (decision.field) {
    case "concept":
      return <span className="text-muted-foreground text-xs">{t("evolution.retyped-upstream")}</span>;
    case "cardinality":
      return <OldNew oldText={formatCardinality(decision.oldValue)} newText={formatCardinality(decision.newValue)} />;
    case "externalDocumentationUrl":
      return <OldNew oldText={decision.oldValue ?? "—"} newText={decision.newValue ?? "—"} />;
    default:
      return <LanguageStringDiff oldValue={decision.oldValue} newValue={decision.newValue} />;
  }
}

/** The profile's current value of the decided field. */
function ProfileValue({ group, decision }: { group: ReviewGroup; decision: EvolutionFieldDecision }) {
  switch (decision.field) {
    case "concept":
      return <ProfileName group={group} profileId={decision.profileValue} />;
    case "cardinality":
      return <>{formatCardinality(decision.profileValue)}</>;
    case "externalDocumentationUrl":
      return <>{decision.profileValue ?? "—"}</>;
    default:
      return <LanguageStringValue value={decision.profileValue} />;
  }
}

function formatCardinality(value: [number, number | null] | null): string {
  return value ? `[${value[0]}..${value[1] ?? "*"}]` : "—";
}

function OldNew({ oldText, newText }: { oldText: string; newText: string }) {
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <span className="line-through decoration-muted-foreground/60">{oldText}</span>
      <ArrowRight className="h-3 w-3" />
      <span className="text-foreground">{newText}</span>
    </span>
  );
}

/** One line per language tag, only for languages whose value actually changed. */
function LanguageStringDiff({ oldValue, newValue }: { oldValue: LanguageString | null; newValue: LanguageString | null }) {
  const oldRecord = oldValue ?? {};
  const newRecord = newValue ?? {};
  const languages = [...new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])].filter((lang) => oldRecord[lang] !== newRecord[lang]);

  return (
    <div className="flex flex-col gap-0.5">
      {languages.map((lang) => (
        <span key={lang} className="flex items-center gap-1 text-muted-foreground">
          <span className="text-xs uppercase text-muted-foreground/70">{lang}:</span>
          <span className="line-through decoration-muted-foreground/60">{oldRecord[lang] ?? "—"}</span>
          <ArrowRight className="h-3 w-3" />
          <span className="text-foreground">{newRecord[lang] ?? "—"}</span>
        </span>
      ))}
    </div>
  );
}

/** All values of a language string, one line per language tag. */
function LanguageStringValue({ value }: { value: LanguageString | null }) {
  const record = value ?? {};
  const languages = Object.keys(record);
  if (languages.length === 0) return <>—</>;

  return (
    <span className="inline-flex flex-col gap-0.5 align-top">
      {languages.map((lang) => (
        <span key={lang}>
          <span className="text-xs uppercase text-muted-foreground/70">{lang}: </span>
          {record[lang]}
        </span>
      ))}
    </span>
  );
}

function ChoiceButtons({
  group,
  choices,
  selectedChoiceId,
  disabled,
  onSelect,
}: {
  group: ReviewGroup;
  choices: EvolutionChoice[];
  selectedChoiceId: string;
  disabled: boolean;
  onSelect: (choiceId: string) => void;
}) {
  const { t } = useTranslation();

  const choiceLabel = (choice: EvolutionChoice): ReactNode => {
    if (choice.targetProfileId) {
      return <Trans i18nKey="evolution.choice.retarget" components={{ name: <ProfileName group={group} profileId={choice.targetProfileId} /> }} />;
    }
    return t(`evolution.choice.${choice.id}`);
  };

  const allChoices: { id: string; label: ReactNode; icon?: typeof Wrench }[] = [
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
