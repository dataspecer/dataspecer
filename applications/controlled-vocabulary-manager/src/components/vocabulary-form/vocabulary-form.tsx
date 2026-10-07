import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { baseLanguage } from "@/lib/language"
import {
  LanguageStringInput,
  createLanguageStringRow,
  languageStringToRows,
  rowsToLanguageString,
  type LanguageStringRow,
} from "./language-string-input"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
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

/**
 * Which of the vocabulary's URLs is used as its main reference when it is not SKOS-based.
 * Only exists in the form - the chosen URL is what gets stored as `references`.
 */
type ReferenceSource = "access" | "documentation"

interface VocabularyFormValues {
  title: LanguageStringRow[]
  conformsToSkos: boolean
  referenceSource: ReferenceSource
  references: string
  pattern: string
  accessUrl: string
  /**
   * Only exists in the form - when checked, the access URL is also stored as
   * the download URL.
   */
  accessUrlIsDownload: boolean
  documentation: string
}

interface VocabularyFormProps {
  initialValues?: ControlledVocabulary
  currentVocabularyId?: string
  onCancel: () => void
  onConfirm: (vocabulary: Omit<ControlledVocabulary, 'id' | 'type'>) => void
}

/**
 * Fields that are not filled in are empty in the form, but null in the
 * controlled vocabulary.
 */
function emptyToNull(value: string): string | null {
  return value === "" ? null : value
}

function initialReferenceSource(vocabulary?: ControlledVocabulary): ReferenceSource {
  if (
    vocabulary !== undefined
    && !vocabulary.conformsToSkos
    && vocabulary.references !== ""
    && vocabulary.references === vocabulary.documentation
    && vocabulary.references !== vocabulary.distribution.accessUrl
  ) {
    return "documentation"
  }
  return "access"
}

export function VocabularyForm({
  initialValues,
  currentVocabularyId,
  onCancel,
  onConfirm,
}: VocabularyFormProps) {
  const { t, i18n } = useTranslation()
  const defaultLanguage = baseLanguage(i18n.language)
  const { vocabularies } = useVocabulariesContext()

  const schema = useMemo(() => z.object({
    title: z.array(z.object({ key: z.string(), lang: z.string(), value: z.string() }))
      .superRefine((rows, context) => {
        if (rows.length === 0) {
          context.addIssue({ code: "custom", message: t("form.validation.requiredField") })
        } else if (rows.some((row) => row.lang.trim() === "" || row.value.trim() === "")) {
          context.addIssue({ code: "custom", message: t("form.validation.nameIncomplete") })
        } else if (rows.some((row) => row.lang.trim().length !== 2)) {
          context.addIssue({ code: "custom", message: t("form.validation.languageLength") })
        } else if (new Set(rows.map((row) => row.lang.trim())).size !== rows.length) {
          context.addIssue({ code: "custom", message: t("form.validation.duplicateLanguage") })
        }
      }),
    conformsToSkos: z.boolean(),
    referenceSource: z.enum(["access", "documentation"]),
    references: z.string(),
    pattern: z.string().refine(
      (val) => {
        if (!val) return true;
        try { new RegExp(val); return true; } catch { return false; }
      },
      { message: t("form.validation.invalidRegex") }
    ),
    accessUrl: z.string().min(1, t("form.validation.requiredField")).url(t("form.validation.invalidUrl")),
    accessUrlIsDownload: z.boolean(),
    documentation: z.union([z.literal(""), z.string().url(t("form.validation.invalidUrl"))]),
  }).superRefine((values, context) => {
    if (values.conformsToSkos) {
      // The scheme IRI is only entered for SKOS-based vocabularies.
      if (values.references === "") {
        context.addIssue({ code: "custom", path: ["references"], message: t("form.validation.requiredField") })
      } else if (!z.string().url().safeParse(values.references).success) {
        context.addIssue({ code: "custom", path: ["references"], message: t("form.validation.invalidUrl") })
      }
    } else if (values.referenceSource === "documentation" && values.documentation === "") {
      context.addIssue({ code: "custom", path: ["documentation"], message: t("form.validation.requiredField") })
    }
  }), [t])

  const form = useForm<VocabularyFormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      title: initialValues && Object.keys(initialValues.title).length > 0
        ? languageStringToRows(initialValues.title)
        : [createLanguageStringRow(defaultLanguage)],
      conformsToSkos: initialValues?.conformsToSkos ?? true,
      referenceSource: initialReferenceSource(initialValues),
      references: initialValues?.references ?? "",
      pattern: initialValues?.pattern ?? "",
      accessUrl: initialValues?.distribution.accessUrl ?? "",
      // A new vocabulary is assumed to be a downloadable file. Of an existing
      // one, only a download URL equal to the access URL is kept by this form.
      accessUrlIsDownload: initialValues === undefined
        || initialValues.distribution.downloadUrl === initialValues.distribution.accessUrl,
      documentation: initialValues?.documentation ?? "",
    },
  })

  const conformsToSkos = form.watch("conformsToSkos")
  const referenceSource = form.watch("referenceSource")

  const handleSubmit = (values: VocabularyFormValues) => {
    // SKOS-based vocabularies are referenced by their scheme IRI, others by
    // the URL chosen as their main reference.
    const references = values.conformsToSkos
      ? values.references
      : values.referenceSource === "documentation" ? values.documentation : values.accessUrl

    // Check if the vocabulary's reference already exists in other vocabularies
    const existingVocab = vocabularies.find((v) => v.references === references)
    if (existingVocab && existingVocab.id !== currentVocabularyId) {
      form.setError(
        values.conformsToSkos ? "references" : values.referenceSource === "documentation" ? "documentation" : "accessUrl",
        { type: "manual", message: t("form.validation.duplicateIri") },
      )
      return
    }

    // Transform form values to the controlled vocabulary domain object.
    // Authoring/editing through this form always makes it a locally-authored
    // vocabulary, so its iri (if it had one from an import) is reset to null -
    // a fresh one is generated on the next DSV export.
    const vocabulary: Omit<ControlledVocabulary, 'id' | 'type'> = {
      title: rowsToLanguageString(values.title),
      references,
      conformsToSkos: values.conformsToSkos,
      pattern: emptyToNull(values.pattern),
      documentation: emptyToNull(values.documentation),
      distribution: {
        downloadUrl: values.accessUrlIsDownload ? values.accessUrl : null,
        accessUrl: values.accessUrl,
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
                    <LanguageStringInput
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      defaultLanguage={defaultLanguage}
                      placeholder={t("form.placeholder.name")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="conformsToSkos"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          form.setValue("conformsToSkos", checked, { shouldValidate: true })
                        }
                      />
                    </FormControl>
                    <FormLabel>{t("form.field.conformsToSkos")}</FormLabel>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("form.field.conformsToSkos.hint")}</p>
                </FormItem>
              )}
            />
            {/*
              Both variants stay mounted and only the applicable one is shown:
              react-hook-form drops the value of an unmounted field, which
              would leave it missing from the values the schema validates.
            */}
            <div className={conformsToSkos ? undefined : "hidden"}>
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
            </div>
            <div className={conformsToSkos ? "hidden" : undefined}>
              <FormField
                control={form.control}
                name="referenceSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.field.referenceSource")}</FormLabel>
                    <div className="flex gap-2">
                      {(["access", "documentation"] as const).map((source) => (
                        <Button
                          key={source}
                          type="button"
                          size="xsm"
                          variant={field.value === source ? "default" : "outline"}
                          aria-pressed={field.value === source}
                          onClick={() => form.setValue("referenceSource", source, { shouldValidate: true })}
                        >
                          {t(source === "access" ? "form.field.accessUrl" : "form.field.docsUrl")}
                        </Button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="pattern"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t(conformsToSkos ? "form.field.regex" : "form.field.regexOther")}
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
              name="accessUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("form.field.accessUrl")}
                    <span className="text-destructive"> *</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={t("form.placeholder.accessUrl")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="accessUrlIsDownload"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                      />
                    </FormControl>
                    <FormLabel>{t("form.field.accessUrlIsDownload")}</FormLabel>
                  </div>
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
                    {!conformsToSkos && referenceSource === "documentation" && (
                      <span className="text-destructive"> *</span>
                    )}
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
