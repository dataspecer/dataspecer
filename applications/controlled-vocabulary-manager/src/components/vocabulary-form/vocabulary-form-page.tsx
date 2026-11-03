import { useTranslation, Trans } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { VocabularyForm } from "./vocabulary-form"
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model"
import { useConfig } from "@/contexts/config-context"
import type { MetadataResult } from "@/sources/types"

interface VocabularyFormPageProps {
  vocabulary?: ControlledVocabulary
  /** Metadata read from a source, prefilling the form of a new vocabulary. */
  prefilled?: MetadataResult
  onCancel: () => void
  onConfirm: (vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => void
}

export function VocabularyFormPage({
  vocabulary,
  prefilled,
  onCancel,
  onConfirm,
}: VocabularyFormPageProps) {
  const { t } = useTranslation()
  const { managerUrl } = useConfig()
  const isEditMode = vocabulary !== undefined
  const kind = isEditMode ? "edit" : prefilled ? "prefilled" : "empty"

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager"), href: managerUrl },
          { label: t("breadcrumb.controlledVocabularies") },
          { label: t({ edit: "breadcrumb.edit", prefilled: "breadcrumb.addFromSourceEdit", empty: "breadcrumb.addByUrl" }[kind]) },
        ]}
        onItemClick={onCancel}
      />
      <h1 className="text-page-title font-semibold mb-1">
        {t(`form.${kind}.title`)}
      </h1>
      <p className="text-sm text-muted-foreground mb-4">
        <Trans
          i18nKey={`form.${kind}.subtitle`}
          components={{
            asterisk: <span className="text-destructive" />,
          }}
        />
      </p>
      <VocabularyForm
        initialValues={vocabulary ?? prefilled?.metadata}
        warnings={prefilled?.warnings}
        sampleIris={prefilled?.sampleIris}
        currentVocabularyId={vocabulary?.id}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    </>
  )
}
