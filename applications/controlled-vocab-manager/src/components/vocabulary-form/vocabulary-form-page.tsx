import { useTranslation, Trans } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { VocabularyForm } from "./vocabulary-form"
import type { Vocabulary } from "@/types/vocabulary"
import { useConfig } from "@/contexts/config-context"

interface VocabularyFormPageProps {
  vocabulary?: Vocabulary
  onCancel: () => void
  onConfirm: (vocabulary: Vocabulary) => void
}

export function VocabularyFormPage({
  vocabulary,
  onCancel,
  onConfirm,
}: VocabularyFormPageProps) {
  const { t } = useTranslation()
  const { managerUrl } = useConfig()
  const isEditMode = vocabulary !== undefined

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager"), href: managerUrl },
          { label: t("breadcrumb.controlledVocabularies"), onClick: onCancel },
          { label: t(isEditMode ? "breadcrumb.edit" : "breadcrumb.addByUrl") },
        ]}
      />
      <h1 className="text-page-title font-semibold mb-1">
        {t(isEditMode ? "form.edit.title" : "form.empty.title")}
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        <Trans
          i18nKey={isEditMode ? "form.edit.subtitle" : "form.empty.subtitle"}
          components={{
            asterisk: <span className="text-destructive" />,
          }}
        />
      </p>
      <VocabularyForm
        initialValues={vocabulary}
        currentVocabularyId={vocabulary?.id}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </>
  )
}
