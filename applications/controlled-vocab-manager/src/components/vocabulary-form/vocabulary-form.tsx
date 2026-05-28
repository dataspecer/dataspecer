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
import type { Vocabulary } from "@/types/vocabulary"

interface VocabularyFormValues {
  name: string
  iri: string
  regex: string
  downloadUrl: string
  docsUrl: string
}

interface VocabularyFormProps {
  initialValues?: Vocabulary
  currentVocabularyId?: string
  onCancel: () => void
  onConfirm: (vocabulary: Vocabulary) => void
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
    name: z.string().min(1, t("form.validation.requiredField")),
    iri: z.string().min(1, t("form.validation.requiredField")).url(t("form.validation.invalidUrl")),
    regex: z.string().refine(
      (val) => {
        if (!val) return true;
        try { new RegExp(val); return true; } catch { return false; }
      },
      { message: t("form.validation.invalidRegex") }
    ),
    downloadUrl: z.string().min(1, t("form.validation.requiredField")).url(t("form.validation.invalidUrl")),
    docsUrl: z.union([z.literal(""), z.string().url(t("form.validation.invalidUrl"))]),
  }), [t])

  const form = useForm<VocabularyFormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: initialValues?.name ?? "",
      iri: initialValues?.iri ?? "",
      regex: initialValues?.regex ?? "",
      downloadUrl: initialValues?.downloadUrl ?? "",
      docsUrl: initialValues?.docsUrl ?? "",
    },
  })

  const handleSubmit = (values: VocabularyFormValues) => {
    // Check if IRI already exists in other vocabularies
    const existingVocab = vocabularies.find((v) => v.iri === values.iri)
    if (existingVocab && existingVocab.id !== currentVocabularyId) {
      form.setError("iri", {
        type: "manual",
        message: t("form.validation.duplicateIri"),
      })
      return
    }

    // Transform form values to Vocabulary domain object
    const vocabulary: Vocabulary = {
      id: values.iri,
      source: initialValues?.source,
      ...values,
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
              name="name"
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
              name="iri"
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
              name="regex"
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
              name="docsUrl"
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
