import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useVocabulariesContext } from "@/contexts/vocabularies-context"
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model"

interface VocabularyFormValues {
  title: string
  references: string
  pattern: string
  downloadUrl: string
  documentation: string
}

interface VocabularyFormProps {
  initialValues?: ControlledVocabulary
  currentVocabularyId?: string
  onCancel: () => void
  onConfirm: (vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => void
}

export function VocabularyForm({
  initialValues,
  currentVocabularyId,
  onCancel,
  onConfirm,
}: VocabularyFormProps) {
  const { t } = useTranslation()
  const { vocabularies } = useVocabulariesContext()

  const schema = useMemo(() => z.object({
    title: z.string().min(1, t("form.validation.requiredField")),
    references: z.string().min(1, t("form.validation.requiredField")).url(t("form.validation.invalidUrl")),
    pattern: z.string().refine(
      (val) => {
        if (!val) return true;
        try { new RegExp(val); return true; } catch { return false; }
      },
      { message: t("form.validation.invalidRegex") }
    ),
    downloadUrl: z.string().min(1, t("form.validation.requiredField")).url(t("form.validation.invalidUrl")),
    documentation: z.union([z.literal(""), z.string().url(t("form.validation.invalidUrl"))]),
  }), [t])

  const form = useForm<VocabularyFormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      title: initialValues?.title ?? "",
      references: initialValues?.references ?? "",
      pattern: initialValues?.pattern ?? "",
      downloadUrl: initialValues?.distribution.downloadUrl ?? "",
      documentation: initialValues?.documentation ?? "",
    },
  })

  const handleSubmit = (values: VocabularyFormValues) => {
    // Check if the vocabulary's IRI already exists in other vocabularies
    const existingVocab = vocabularies.find((v) => v.references === values.references)
    if (existingVocab && existingVocab.id !== currentVocabularyId) {
      form.setError("references", {
        type: "manual",
        message: t("form.validation.duplicateIri"),
      })
      return
    }

    // Transform form values to the controlled vocabulary domain object.
    // Authoring/editing through this form always makes it a locally-authored
    // vocabulary, so its iri (if it had one from an import) is reset to null -
    // a fresh one is generated on the next DSV export.
    const vocabulary: Omit<ControlledVocabulary, 'id' | 'type'> = {
      title: values.title,
      references: values.references,
      pattern: values.pattern,
      documentation: values.documentation,
      distribution: {
        downloadUrl: values.downloadUrl,
        accessUrl: values.downloadUrl,
      },
      iri: null,
    }
    onConfirm(vocabulary)
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <Form {...form}>
        <Card>
          <CardContent className="p-5 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.field.name")}
                    <span className="text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.placeholder.name")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="references"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.field.iri")}
                    <span className="text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.placeholder.iri")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.field.regex")}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.placeholder.regex")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="downloadUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.field.downloadUrl")}
                    <span className="text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.placeholder.downloadUrl")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="documentation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.field.docsUrl")}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.placeholder.docsUrl")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        <div className="mt-6 flex gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onCancel}>
            {t("form.cancel")}
          </Button>
          <Button size="sm" type="submit" disabled={!form.formState.isValid}>
            {t("form.confirm")}
          </Button>
        </div>
      </Form>
    </form>
  )
}
