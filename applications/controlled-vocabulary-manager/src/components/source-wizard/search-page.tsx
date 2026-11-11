import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConfig } from "@/contexts/config-context"
import { useCatalogue } from "@/hooks/use-catalogue"
import { searchBackStep, type WizardState } from "@/hooks/use-source-wizard"
import { selectName } from "@/lib/language"
import { filterCandidates } from "@/sources/catalogue"
import { getSource, sourceDescriptors } from "@/sources/registry"
import type { MetadataResult, SourceCandidate, SourceGroup } from "@/sources/types"
import { CandidateList } from "./candidate-list"
import { GroupList } from "./group-list"
import { LoadErrorAlert, LoadingIndicator } from "./load-status"

/**
 * How long after the last keystroke the typed text is searched. The vocabularies are searched in the
 * browser, so this only keeps the list from changing with every letter.
 */
const SEARCH_DELAY_MS = 150

interface SearchPageProps {
  sourceId: string
  state: WizardState
  onGroupsPageChange: (page: number) => void
  onGroupSelect: (group: SourceGroup | null) => void
  onSearch: (query: string) => void
  onCandidatesPageChange: (page: number) => void
  /** Called with what was read about the chosen vocabulary. */
  onMetadata: (result: MetadataResult) => void
  /** Returns to the list of vocabularies. */
  onCancel: () => void
  /** Returns to the choice of the source. */
  onChangeSource: () => void
}

/**
 * Finding a vocabulary in the source the user has chosen: by searching its
 * name in all vocabularies of the source, or by browsing the groups of the
 * source, such as publishers, and the vocabularies of a group.
 * Choosing a vocabulary reads its metadata from the source while the list waits, and then continues with them.
 */
export function SearchPage({
  sourceId,
  state,
  onGroupsPageChange,
  onGroupSelect,
  onSearch,
  onCandidatesPageChange,
  onMetadata,
  onCancel,
  onChangeSource,
}: SearchPageProps) {
  const { t, i18n } = useTranslation()
  const { managerUrl } = useConfig()
  const [text, setText] = useState(state.query)
  // The vocabularies are searched as the user types.
  useEffect(() => {
    const query = text.trim()
    if (query === state.query) {
      return
    }
    const timer = setTimeout(() => onSearch(query), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text, state.query, onSearch])
  // The vocabulary that is being read. Reading is cancelled by leaving the page.
  const [reading, setReading] = useState<SourceCandidate | null>(null)
  const readRequest = useRef<AbortController | null>(null)
  useEffect(() => () => readRequest.current?.abort(), [])
  const source = getSource(sourceId)
  const descriptor = sourceDescriptors.find((candidate) => candidate.id === sourceId)
  const { state: catalogueState, retry } = useCatalogue(source)
  const searching = state.query !== ""
  const browsingGroup = !searching && state.group !== null
  const catalogue = catalogueState.status === "ready" ? catalogueState.catalogue : null
  // A search looks in all the vocabularies of the source, not only in those of the chosen group.
  const candidates = useMemo(
    () => catalogue === null ? [] : filterCandidates(catalogue, searching ? { query: state.query } : { groupId: state.group?.id }),
    [catalogue, searching, state.query, state.group],
  )

  if (source === undefined || descriptor === undefined) {
    return null
  }

  const clear = () => {
    setText("")
    onSearch("")
  }
  const read = async (candidate: SourceCandidate) => {
    const controller = new AbortController()
    readRequest.current = controller
    setReading(candidate)
    try {
      onMetadata(await source.readMetadata(candidate, { language: i18n.language, signal: controller.signal }))
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error
      }
    } finally {
      if (readRequest.current === controller) {
        readRequest.current = null
        setReading(null)
      }
    }
  }
  const back = () => {
    if (readRequest.current !== null) {
      readRequest.current.abort()
      readRequest.current = null
      setReading(null)
      return
    }
    switch (searchBackStep(state)) {
      case "clear-search":
        clear()
        break
      case "all-groups":
        onGroupSelect(null)
        break
      case "source":
        onChangeSource()
        break
    }
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager"), href: managerUrl },
          { label: t("breadcrumb.controlledVocabularies"), onClick: onCancel },
          { label: selectName(descriptor.name, i18n.language), onClick: onChangeSource },
          { label: t("breadcrumb.search") },
        ]}
      />
      <h1 className="text-page-title font-semibold mb-6">{t("search.title")}</h1>
      {/* The search and the list wait while a vocabulary is read. */}
      <div inert={reading !== null} aria-busy={reading !== null} className={reading !== null ? "opacity-70" : undefined}>
        <div className="flex gap-2 mb-6">
          <Input
            className="h-12 border-2 border-primary text-lg focus-visible:ring-primary/40"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t("search.placeholder")}
            aria-label={t("search.placeholder")}
            autoFocus
          />
          {(searching || text !== "") && (
            <Button type="button" variant="outline" className="h-12" onClick={clear}>{t("search.clear")}</Button>
          )}
        </div>
        {catalogueState.status === "loading" && <LoadingIndicator />}
        {catalogueState.status === "error" && <LoadErrorAlert error={catalogueState.error} onRetry={retry} />}
        {catalogue !== null && (searching ? (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">
              {t("search.resultsFor", { query: state.query })}
            </h2>
            <CandidateList
              candidates={candidates}
              showGroup
              page={state.candidatesPage}
              onPageChange={onCandidatesPageChange}
              onSelect={read}
              readingId={reading?.id ?? null}
            />
          </section>
        ) : browsingGroup && state.group ? (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <Button variant="outline" size="xsm" onClick={() => onGroupSelect(null)}>
                {t("search.allPublishers")}
              </Button>
              <h2 className="text-sm font-medium text-muted-foreground">
                {selectName(state.group.label, i18n.language)}
              </h2>
            </div>
            <CandidateList
              candidates={candidates}
              showGroup={false}
              page={state.candidatesPage}
              onPageChange={onCandidatesPageChange}
              onSelect={read}
              readingId={reading?.id ?? null}
            />
          </section>
        ) : catalogue.groups.length > 0 ? (
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-2">{t("search.browseByPublisher")}</h2>
            <GroupList
              groups={catalogue.groups}
              page={state.groupsPage}
              onPageChange={onGroupsPageChange}
              onSelect={onGroupSelect}
            />
          </section>
        ) : null)}
      </div>
      <div className="mt-6">
        <Button variant="outline" size="sm" onClick={back}>
          {t("search.back")}
        </Button>
      </div>
    </>
  )
}
