import { useTranslation } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Button } from "@/components/ui/button"
import { useConfig } from "@/contexts/config-context"
import { selectName } from "@/lib/language"
import { getSource, sourceDescriptors } from "@/sources/registry"
import { GroupList } from "./group-list"

interface SearchPageProps {
  sourceId: string
  /** Zero-based number of the shown page of the groups. */
  groupsPage: number
  onGroupsPageChange: (page: number) => void
  /** Returns to the list of vocabularies. */
  onCancel: () => void
  /** Returns to the choice of the source. */
  onChangeSource: () => void
}

/**
 * Finding a vocabulary in the source the user has chosen.
 */
export function SearchPage({ sourceId, groupsPage, onGroupsPageChange, onCancel, onChangeSource }: SearchPageProps) {
  const { t, i18n } = useTranslation()
  const { managerUrl } = useConfig()
  const source = getSource(sourceId)
  const descriptor = sourceDescriptors.find((candidate) => candidate.id === sourceId)

  if (source === undefined || descriptor === undefined) {
    return null
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
      {source.listGroups && (
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">{t("search.browseByPublisher")}</h2>
          <GroupList source={source} page={groupsPage} onPageChange={onGroupsPageChange} />
        </section>
      )}
      <div className="mt-6">
        <Button variant="outline" size="sm" onClick={onChangeSource}>
          {t("search.back")}
        </Button>
      </div>
    </>
  )
}
