import { Eye, Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model"

interface VocabularyCardProps {
  vocabulary: ControlledVocabulary
  onView: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function VocabularyCard({ vocabulary, onView, onEdit, onDelete }: VocabularyCardProps) {
  const { t } = useTranslation()

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex-1">
        <div className="font-medium">{vocabulary.title}</div>
        <div className="text-caption text-muted-foreground font-mono">{vocabulary.references}</div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <button
          className="text-muted-foreground hover:text-foreground"
          title={t("actions.view")}
          onClick={onView}
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        {onEdit && (
          <button
            className="text-muted-foreground hover:text-foreground"
            title={t("actions.edit")}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            className="text-muted-foreground hover:text-destructive"
            title={t("actions.remove")}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
