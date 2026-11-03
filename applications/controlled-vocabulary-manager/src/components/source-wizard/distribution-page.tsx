import { useCallback, useEffect, useRef, useState } from "react"
import { Info, Loader } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useConfig } from "@/contexts/config-context"
import { selectName } from "@/lib/language"
import { cn } from "@/lib/utils"
import { getSource, sourceDescriptors } from "@/sources/registry"
import type { CandidateDetail, MetadataResult, SourceCandidate } from "@/sources/types"
import { LoadErrorAlert } from "./listing-view"

interface DistributionPageProps {
  sourceId: string
  candidate: SourceCandidate
  /** Returns to the search. */
  onBack: () => void
  onCancel: () => void
  onChangeSource: () => void
  /** Called with what was read about the vocabulary from the chosen distribution. */
  onContinue: (result: MetadataResult) => void
}

type DetailState =
  | { status: "loading" }
  | { status: "ready", detail: CandidateDetail }
  | { status: "error", error: unknown }

/**
 * Choosing the distribution of the chosen vocabulary the metadata are read
 * from. The distribution the source recommends is preselected.
 */
export function DistributionPage({ sourceId, candidate, onBack, onCancel, onChangeSource, onContinue }: DistributionPageProps) {
  const { t, i18n } = useTranslation()
  const { managerUrl } = useConfig()
  const source = getSource(sourceId)
  const descriptor = sourceDescriptors.find((item) => item.id === sourceId)
  const [state, setState] = useState<DetailState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reading, setReading] = useState(false)

  useEffect(() => {
    if (source === undefined) {
      return
    }
    const controller = new AbortController()
    setState({ status: "loading" })
    source.getDetail(candidate.id, { signal: controller.signal })
      .then((detail) => {
        setSelectedId(detail.defaultDistributionId)
        setState({ status: "ready", detail })
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setState({ status: "error", error })
        }
      })
    return () => controller.abort()
  }, [source, candidate.id, attempt])

  // Reading the metadata is cancelled by leaving the page.
  const readRequest = useRef<AbortController | null>(null)
  useEffect(() => () => readRequest.current?.abort(), [])

  const handleContinue = useCallback(async () => {
    if (source === undefined || state.status !== "ready" || selectedId === null) {
      return
    }
    const controller = new AbortController()
    readRequest.current = controller
    setReading(true)
    try {
      const result = await source.getMetadata(state.detail, selectedId, {
        language: i18n.language,
        signal: controller.signal,
      })
      onContinue(result)
    } catch (error) {
      if (!controller.signal.aborted) {
        setState({ status: "error", error })
      }
    } finally {
      setReading(false)
    }
  }, [source, state, selectedId, i18n.language, onContinue])

  if (source === undefined || descriptor === undefined) {
    return null
  }
  const title = selectName(candidate.title, i18n.language)
  const hasUnreadable = state.status === "ready" && state.detail.distributions.some((item) => !item.readable)

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager"), href: managerUrl },
          { label: t("breadcrumb.controlledVocabularies"), onClick: onCancel },
          { label: selectName(descriptor.name, i18n.language), onClick: onChangeSource },
          { label: t("breadcrumb.search"), onClick: onBack },
          { label: t("breadcrumb.distribution") },
        ]}
      />
      <h1 className="text-page-title font-semibold mb-1">{t("distribution.title")}</h1>
      <p className="text-muted-foreground mb-6">{title}</p>

      {state.status === "loading" && (
        <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader className="h-4 w-4 animate-spin" />
          {t("search.loading")}
        </div>
      )}
      {state.status === "error" && (
        <LoadErrorAlert error={state.error} onRetry={() => setAttempt((current) => current + 1)} />
      )}
      {state.status === "ready" && (
        <>
          {hasUnreadable && (
            <div className="flex gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 mb-4 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              {t("distribution.unreadableNote")}
            </div>
          )}
          {state.detail.distributions.length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-6 text-center text-muted-foreground">
              {t("distribution.empty")}
            </div>
          ) : (
            <div className="space-y-2" role="radiogroup" aria-label={t("distribution.title")}>
              {state.detail.distributions.map((item) => {
                const selected = item.id === selectedId
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      "w-full text-left bg-card border border-border rounded-lg px-4 py-3 cursor-pointer hover:border-primary",
                      selected && "border-primary ring-1 ring-primary",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{item.format}</Badge>
                      <span className={cn("font-medium", selected && "text-primary")}>
                        {selectName(item.title, i18n.language)}
                      </span>
                    </div>
                    <div className="text-caption text-muted-foreground break-all mt-1">
                      {item.downloadUrl ?? item.accessUrl}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-6 flex gap-2">
        <Button variant="outline" size="sm" onClick={onBack} disabled={reading}>
          {t("search.back")}
        </Button>
        <Button
          size="sm"
          disabled={state.status !== "ready" || selectedId === null || reading}
          onClick={handleContinue}
        >
          {reading && <Loader className="h-4 w-4 animate-spin mr-1" />}
          {t("sourceSelection.continue")}
        </Button>
      </div>
    </>
  )
}
