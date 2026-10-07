import { Plus, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * One editable entry of a language string. The key identifies the row across
 * edits of its language tag, which the language string itself is keyed by.
 */
export interface LanguageStringRow {
  key: string
  lang: string
  value: string
}

let nextRowKey = 0

export function createLanguageStringRow(lang: string, value: string = ""): LanguageStringRow {
  return { key: `row-${nextRowKey++}`, lang, value }
}

interface LanguageStringInputProps {
  value: LanguageStringRow[]
  onChange: (rows: LanguageStringRow[]) => void
  /** Called when one of the inputs loses focus, so that the form validates the field. */
  onBlur?: () => void
  /** Language tag of a newly added row. */
  defaultLanguage: string
  placeholder?: string
}

/**
 * Edits a language string as rows of a language tag and a text. The last row
 * cannot be removed, a name is always required.
 */
export function LanguageStringInput({ value, onChange, onBlur, defaultLanguage, placeholder }: LanguageStringInputProps) {
  const { t } = useTranslation()

  const updateRow = (key: string, changes: Partial<LanguageStringRow>) =>
    onChange(value.map((row) => (row.key === key ? { ...row, ...changes } : row)))

  return (
    <div className="space-y-2">
      {value.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <Input
            className="w-20 shrink-0"
            aria-label={t("form.placeholder.language")}
            placeholder={t("form.placeholder.language")}
            value={row.lang}
            onBlur={onBlur}
            onChange={(event) => updateRow(row.key, { lang: event.target.value })}
          />
          <Input
            placeholder={placeholder}
            value={row.value}
            onBlur={onBlur}
            onChange={(event) => updateRow(row.key, { value: event.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label={t("form.field.removeName")}
            disabled={value.length <= 1}
            onClick={() => onChange(value.filter((other) => other.key !== row.key))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="xsm"
        onClick={() => onChange([...value, createLanguageStringRow(nextLanguage(value, defaultLanguage))])}
      >
        <Plus className="mr-1 h-4 w-4" />
        {t("form.field.addName")}
      </Button>
    </div>
  )
}

/**
 * The language of a new row: the default one if it has no name yet, otherwise
 * empty so that the user has to choose.
 */
function nextLanguage(rows: LanguageStringRow[], defaultLanguage: string): string {
  return rows.some((row) => row.lang === defaultLanguage) ? "" : defaultLanguage
}

export function languageStringToRows(value: Record<string, string>): LanguageStringRow[] {
  return Object.entries(value).map(([lang, text]) => createLanguageStringRow(lang, text))
}

export function rowsToLanguageString(rows: LanguageStringRow[]): Record<string, string> {
  return Object.fromEntries(rows.map((row) => [row.lang.trim(), row.value.trim()]))
}
