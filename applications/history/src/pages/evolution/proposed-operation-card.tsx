import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProposedOperation, ProposedOperationStatus } from "./types";
import { ModelBadge } from "./model-badge";
import { OperationRenderer, getOperationTitleKey } from "./operations/operation-renderer";

/**
 * The apply/skip buttons only change local UI state for now - no operation
 * is actually executed against any model.
 */
export function ProposedOperationCard({ proposedOperation }: { proposedOperation: ProposedOperation }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<ProposedOperationStatus>("pending");

  return (
    <Card className={cn("bg-muted/30", status === "skipped" && "opacity-60")}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <ModelBadge model={proposedOperation.targetModel} />
          <span className="truncate text-sm font-medium">{t(getOperationTitleKey(proposedOperation.operation))}</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status === "pending" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setStatus("skipped")}>
                <X className="mr-1 h-4 w-4" />{t("evolution.skip")}
              </Button>
              <Button size="sm" onClick={() => setStatus("applied")}>
                <Check className="mr-1 h-4 w-4" />{t("evolution.apply")}
              </Button>
            </>
          ) : (
            <Badge variant={status === "applied" ? "default" : "outline"}>
              {t(status === "applied" ? "evolution.status-applied" : "evolution.status-skipped")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <OperationRenderer operation={proposedOperation.operation} />
      </CardContent>
    </Card>
  );
}
