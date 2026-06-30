import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PendingChange } from "./types";
import { ModelBadge } from "./model-badge";
import { ProposedOperationCard } from "./proposed-operation-card";
import { OperationRenderer } from "./operations/operation-renderer";

export function ChangeCard({ change }: { change: PendingChange }) {
  const { t, i18n } = useTranslation();
  const formattedDate = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(change.occurredAt));

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <ModelBadge model={change.sourceModel} />
          <span className="text-xs text-muted-foreground">{formattedDate}</span>
        </div>
        <CardTitle className="text-base">{change.summary}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border bg-muted/30">
          <OperationRenderer operation={change.operation} />
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-muted-foreground">
            {t("evolution.proposed-operations", { count: change.proposedOperations.length })}
          </div>
          {change.proposedOperations.map((po) => (
            <ProposedOperationCard key={po.id} proposedOperation={po} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
