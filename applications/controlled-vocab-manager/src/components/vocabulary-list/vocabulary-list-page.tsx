import { Plus, Link } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { EmptyState } from "./empty-state"
import { VocabularyCard } from "./vocabulary-card"
import type { Vocabulary } from "@/types/vocabulary"

interface VocabularyListPageProps {
  vocabularies: Vocabulary[]
  onNavigateSourceSelection: () => void
  onNavigateFormEmpty: () => void
  onEdit: (vocabulary: Vocabulary) => void
  onDelete: (vocabulary: Vocabulary) => void
}

export function VocabularyListPage({
  vocabularies,
  onNavigateSourceSelection,
  onNavigateFormEmpty,
  onEdit,
  onDelete,
}: VocabularyListPageProps) {
  const { t } = useTranslation()

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager"), href: import.meta.env.VITE_MANAGER },
          { label: t("breadcrumb.controlledVocabularies") },
        ]}
      />
      <PageHeader title={t("list.title")}>
        <Button size="sm" onClick={onNavigateSourceSelection}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {t("list.addFromSource")}
        </Button>
        <Button variant="outline" size="sm" onClick={onNavigateFormEmpty}>
          <Link className="mr-1 h-3.5 w-3.5" />
          {t("list.addByUrl")}
        </Button>
      </PageHeader>
      {vocabularies.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {vocabularies.map((vocab) => (
            <VocabularyCard
              key={vocab.id}
              vocabulary={vocab}
              onEdit={() => onEdit(vocab)}
              onDelete={() => onDelete(vocab)}
            />
          ))}
        </div>
      )}
    </>
  )
}
