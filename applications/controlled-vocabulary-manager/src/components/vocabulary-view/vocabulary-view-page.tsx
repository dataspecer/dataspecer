import { useTranslation } from "react-i18next"
import { Breadcrumb } from "@/components/layout/breadcrumb"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model"
import { useConfig } from "@/contexts/config-context"

interface VocabularyViewPageProps {
  vocabulary: ControlledVocabulary
  onClose: () => void
}

function Field({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="mt-1 text-sm break-all">{value}</p>
    </div>
  )
}

export function VocabularyViewPage({ vocabulary, onClose }: VocabularyViewPageProps) {
  const { t } = useTranslation()
  const { managerUrl } = useConfig()

  return (
    <>
      <Breadcrumb
        items={[
          { label: t("breadcrumb.packageManager"), href: managerUrl },
          { label: t("breadcrumb.controlledVocabularies") },
          { label: t("breadcrumb.view") },
        ]}
        onItemClick={onClose}
      />
      <h1 className="text-page-title font-semibold mb-1">{t("view.title")}</h1>
      <p className="text-sm text-muted-foreground mb-4">{t("view.subtitle")}</p>
      <Card>
        <CardContent className="p-5 space-y-4">
          <Field label={t("form.field.name")} value={vocabulary.title} />
          <Field label={t("form.field.iri")} value={vocabulary.references} />
          <Field label={t("form.field.regex")} value={vocabulary.pattern} />
          <Field label={t("form.field.downloadUrl")} value={vocabulary.distribution.downloadUrl} />
          <Field label={t("form.field.docsUrl")} value={vocabulary.documentation} />
          <Field
            label={t("view.field.datasetIri")}
            value={vocabulary.iri ?? t("view.datasetIri.notAssigned")}
          />
        </CardContent>
      </Card>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>
          {t("view.close")}
        </Button>
      </div>
    </>
  )
}
