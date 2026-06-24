import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockPendingChanges } from "./mock-data";
import { ChangeCard } from "./change-card";

/**
 * Changes are reviewed one at a time, in order: the user decides what to do
 * with the proposed operations of the current change, then approves it to
 * move on to the next one.
 */
export function EvolutionPage() {
  const { t } = useTranslation();

  const changes = useMemo(
    () => [...mockPendingChanges].sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()),
    []
  );

  const [index, setIndex] = useState(0);
  const total = changes.length;
  const current = changes[index];

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

          <div key={current.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <ChangeCard change={current} />
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t("evolution.previous")}
            </Button>
            <Button onClick={() => setIndex((i) => i + 1)}>
              {t("evolution.approve-and-continue")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
