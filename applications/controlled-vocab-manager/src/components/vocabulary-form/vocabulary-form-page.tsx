import { useTranslation, Trans } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { VocabularyForm } from "./vocabulary-form"
import type { Vocabulary } from "@/types/vocabulary"

interface VocabularyFormPageProps {
  vocabularies: Vocabulary[]
  onCancel: () => void
  onConfirm: (vocabulary: Vocabulary) => void
}

export function VocabularyFormPage({
  vocabularies,
  onCancel,
  onConfirm,
}: VocabularyFormPageProps) {
  const { t } = useTranslation()

  const handleConfirm = (values: {
    name: string
    iri: string
    regex: string
    downloadUrl: string
    docsUrl: string
  }) => {
    const vocabulary: Vocabulary = {
      id: values.iri,
      ...values,
    }
    onConfirm(vocabulary)
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager"), href: import.meta.env.VITE_MANAGER },
          { label: t("breadcrumb.controlledVocabularies"), onClick: onCancel },
          { label: t("breadcrumb.addByUrl") },
        ]}
      />
      <h1 className="text-page-title font-semibold mb-1">
        {t("form.empty.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        <Trans
          i18nKey="form.empty.subtitle"
          components={{
            asterisk: <span key="asterisk" className="text-destructive" />,
          }}
        />
      </p>
      <VocabularyForm
        vocabularies={vocabularies}
        onCancel={onCancel}
        onConfirm={handleConfirm}
      />
    </>
  )
}
