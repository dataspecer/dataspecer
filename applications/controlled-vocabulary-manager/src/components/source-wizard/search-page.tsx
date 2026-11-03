import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useConfig } from "@/contexts/config-context"
import type { WizardState } from "@/hooks/use-source-wizard"
import { selectName } from "@/lib/language"
import { getSource, sourceDescriptors } from "@/sources/registry"
import type { SourceCandidate, SourceGroup } from "@/sources/types"
import { CandidateList } from "./candidate-list"
import { GroupList } from "./group-list"

interface SearchPageProps {
  sourceId: string
  state: WizardState
  onGroupsPageChange: (page: number) => void
  onGroupSelect: (group: SourceGroup | null) => void
  onSearch: (query: string) => void
  onCandidatesPageChange: (page: number) => void
  onCandidateSelect: (candidate: SourceCandidate) => void
  /** Returns to the list of vocabularies. */
  onCancel: () => void
  /** Returns to the choice of the source. */
  onChangeSource: () => void
}

/**
 * Finding a vocabulary in the source the user has chosen: by searching its
 * name in all vocabularies of the source, or by browsing the groups of the
 * source, such as publishers, and the vocabularies of a group.
 */
export function SearchPage({
  sourceId,
  state,
  onGroupsPageChange,
  onGroupSelect,
  onSearch,
  onCandidatesPageChange,
  onCandidateSelect,
  onCancel,
  onChangeSource,
}: SearchPageProps) {
  const { t, i18n } = useTranslation()
  const { managerUrl } = useConfig()
  const [text, setText] = useState(state.query)
  const source = getSource(sourceId)
  const descriptor = sourceDescriptors.find((candidate) => candidate.id === sourceId)

  if (source === undefined || descriptor === undefined) {
    return null
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSearch(text.trim())
  }
  const clear = () => {
    setText("")
    onSearch("")
  }
  const searching = state.query !== ""
  const browsingGroup = !searching && state.group !== null

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
      <form className="flex gap-2 mb-6" onSubmit={submit}>
        <Input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t("search.placeholder")}
          aria-label={t("search.placeholder")}
        />
        <Button type="submit">{t("search.submit")}</Button>
        {(searching || text !== "") && (
          <Button type="button" variant="outline" onClick={clear}>{t("search.clear")}</Button>
        )}
      </form>
      {searching ? (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            {t("search.resultsFor", { query: state.query })}
          </h2>
          <CandidateList
            source={source}
            filter={{ query: state.query }}
            page={state.candidatesPage}
            onPageChange={onCandidatesPageChange}
            onSelect={onCandidateSelect}
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
            source={source}
            filter={{ groupId: state.group.id }}
            page={state.candidatesPage}
            onPageChange={onCandidatesPageChange}
            onSelect={onCandidateSelect}
          />
        </section>
      ) : source.listGroups ? (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">{t("search.browseByPublisher")}</h2>
          <GroupList
            source={source}
            page={state.groupsPage}
            onPageChange={onGroupsPageChange}
            onSelect={onGroupSelect}
          />
        </section>
      ) : null}
      <div className="mt-6">
        <Button variant="outline" size="sm" onClick={onChangeSource}>
          {t("search.back")}
        </Button>
      </div>
    </>
  )
}
