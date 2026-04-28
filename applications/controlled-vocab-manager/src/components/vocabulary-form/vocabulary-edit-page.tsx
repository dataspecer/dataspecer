import { useTranslation, Trans } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { VocabularyForm } from "./vocabulary-form"
import type { Vocabulary } from "@/types/vocabulary"

interface VocabularyEditPageProps {
  vocabulary: Vocabulary
  onCancel: () => void
  onConfirm: (vocabulary: Vocabulary) => void
}

export function VocabularyEditPage({
  vocabulary,
  onCancel,
  onConfirm,
}: VocabularyEditPageProps) {
  const { t } = useTranslation()

  const handleConfirm = (values: {
    name: string
    iri: string
    regex: string
    downloadUrl: string
    docsUrl: string
  }) => {
    const updated: Vocabulary = {
      id: vocabulary.id,
      source: vocabulary.source,
      ...values,
    }
    onConfirm(updated)
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager") },
          { label: t("breadcrumb.controlledVocabularies"), onClick: onCancel },
          { label: t("breadcrumb.edit") },
        ]}
      />
      <h1 className="text-page-title font-semibold mb-1">
        {t("form.edit.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        <Trans
          i18nKey="form.edit.subtitle"
          components={{
            asterisk: <span className="text-destructive" />,
          }}
        />
      </p>
      <VocabularyForm
        initialValues={vocabulary}
        onCancel={onCancel}
        onConfirm={handleConfirm}
      />
    </>
  )
}
