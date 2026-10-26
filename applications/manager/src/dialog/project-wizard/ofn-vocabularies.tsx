import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OfnVocabulary } from "@dataspecer/ofn-vocabularies";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Section of UI to render OFN vocabularies selection.
 */
export function OfnVocabularies({ selected, onChange, disabled }: { selected: string[]; onChange: (value: string[]) => void; disabled?: boolean }) {
  const { t, i18n } = useTranslation("project-wizard");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<OfnVocabulary[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const label = (v: OfnVocabulary) => v.label[i18n.language] ?? v.label.en ?? v.label.cs ?? Object.values(v.label)[0] ?? v.iri;
  const query = search.trim().toLowerCase();
  const filteredResults = results.filter((v) => [v.iri, ...Object.values(v.label), ...Object.values(v.description)].some((value) => value.toLowerCase().includes(query)));

  useEffect(() => {
    const controller = new AbortController();
    setResults([]);
    setBusy(true);
    setError("");
    const loadVocabularies = async () => {
      try {
        const response = await fetch(import.meta.env.VITE_BACKEND + "/ofn-vocabularies/vocabularies", { signal: controller.signal });
        const vocabularies = (await response.json()) as OfnVocabulary[];
        if (controller.signal.aborted) return;
        setResults(vocabularies);
      } catch (e) {
        if (!controller.signal.aborted) setError(String(e));
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    };
    void loadVocabularies();
    return () => controller.abort();
  }, [retry]);

  return (
    <section aria-labelledby="ofn-picker-title" className="flex min-w-0 flex-col gap-4 md:h-[min(60vh,34rem)]">
      <div className="space-y-1">
        <h3 id="ofn-picker-title" className="text-sm font-medium">
          {t("ofn.choose")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("ofn.choose-help")}</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="ofn-search">{t("ofn.search")}</Label>
        <Input id="ofn-search" type="search" maxLength={1000} value={search} onChange={(e) => setSearch(e.target.value)} disabled={disabled} />
      </div>
      <div className="min-h-0 max-h-72 space-y-2 overflow-y-auto p-1 md:max-h-none md:flex-1" aria-busy={busy}>
        {!busy && !error && !filteredResults.length && <p className="py-6 text-center text-sm text-muted-foreground">{t("ofn.empty")}</p>}
        {filteredResults.map((v) => (
          <label
            key={v.iri}
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent has-checked:border-primary has-checked:bg-accent has-focus-visible:ring-2 has-focus-visible:ring-ring"
          >
            <input
              type="checkbox"
              className="mt-1 size-4 shrink-0 accent-primary"
              checked={selected.includes(v.iri)}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.checked ? [...selected, v.iri] : selected.filter((iri) => iri !== v.iri);
                onChange(next);
              }}
            />
            <span className="min-w-0 space-y-1">
              <span className="block wrap-break-word text-sm font-medium">{label(v)}</span>
              <span className="block wrap-break-word text-sm text-muted-foreground">{v.description?.[i18n.language] ?? v.description?.en ?? v.description?.cs}</span>
              <span className="block break-all text-xs text-muted-foreground">{v.iri}</span>
            </span>
          </label>
        ))}
        {busy && (
          <p role="status" className="py-3 text-center text-sm text-muted-foreground">
            {t("ofn.loading")}
          </p>
        )}
      </div>
      {error && (
        <div className="space-y-2">
          <p role="alert" className="wrap-break-word text-sm text-red-600">
            {error}
          </p>
          <Button type="button" variant="outline" onClick={() => setRetry((value) => value + 1)} disabled={disabled}>
            {t("ofn.retry")}
          </Button>
        </div>
      )}
    </section>
  );
}
