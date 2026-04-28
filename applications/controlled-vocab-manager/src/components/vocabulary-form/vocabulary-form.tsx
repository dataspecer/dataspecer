import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AlertTriangle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"

interface VocabularyFormValues {
  name: string
  iri: string
  regex: string
  downloadUrl: string
  docsUrl: string
}

interface VocabularyFormProps {
  initialValues?: VocabularyFormValues
  onCancel: () => void
  onConfirm: (values: VocabularyFormValues) => void
}

export function VocabularyForm({
  initialValues,
  onCancel,
  onConfirm,
}: VocabularyFormProps) {
  const { t } = useTranslation()

  const [name, setName] = useState(initialValues?.name ?? "")
  const [iri, setIri] = useState(initialValues?.iri ?? "")
  const [regex, setRegex] = useState(initialValues?.regex ?? "")
  const [downloadUrl, setDownloadUrl] = useState(initialValues?.downloadUrl ?? "")
  const [docsUrl, setDocsUrl] = useState(initialValues?.docsUrl ?? "")

  const isValid = name.trim() && iri.trim() && downloadUrl.trim()

  const handleConfirm = () => {
    onConfirm({
      name: name.trim(),
      iri: iri.trim(),
      regex: regex.trim(),
      downloadUrl: downloadUrl.trim(),
      docsUrl: docsUrl.trim(),
    })
  }

  return (
    <>
      <Card>
        <CardContent className="p-5 space-y-4">
          <FormField
            id="name"
            label={t("form.field.name")}
            required
            value={name}
            onChange={setName}
            placeholder={t("form.placeholder.name")}
          />
          <FormField
            id="iri"
            label={t("form.field.iri")}
            required
            value={iri}
            onChange={setIri}
            placeholder={t("form.placeholder.iri")}
          />
          <FormField
            id="regex"
            label={t("form.field.regex")}
            value={regex}
            onChange={setRegex}
            placeholder={t("form.placeholder.regex")}
          />
          <FormField
            id="downloadUrl"
            label={t("form.field.downloadUrl")}
            required
            value={downloadUrl}
            onChange={setDownloadUrl}
            placeholder={t("form.placeholder.downloadUrl")}
          />
          <FormField
            id="docsUrl"
            label={t("form.field.docsUrl")}
            value={docsUrl}
            onChange={setDocsUrl}
            placeholder={t("form.placeholder.docsUrl")}
          />
        </CardContent>
      </Card>
      <Alert variant="warning" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{t("form.validation.required")}</AlertDescription>
      </Alert>
      <div className="mt-6 flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          {t("form.cancel")}
        </Button>
        <Button size="sm" disabled={!isValid} onClick={handleConfirm}>
          {t("form.confirm")}
        </Button>
      </div>
    </>
  )
}
