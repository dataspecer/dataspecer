import { Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Vocabulary } from "@/types/vocabulary"

interface VocabularyCardProps {
  vocabulary: Vocabulary
  onEdit: () => void
  onDelete: () => void
}

export function VocabularyCard({ vocabulary, onEdit, onDelete }: VocabularyCardProps) {
  const { t } = useTranslation()

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="flex-1">
        <div className="font-medium">{vocabulary.name}</div>
        <div className="text-caption text-muted-foreground font-mono">{vocabulary.iri}</div>
      </div>
      <div className="flex items-center gap-3 ml-4">
        {vocabulary.source && (
          <span className="text-caption text-success-foreground bg-success px-2 py-0.5 rounded">
            {vocabulary.source}
          </span>
        )}
        <button
          className="text-muted-foreground hover:text-foreground"
          title={t("actions.edit")}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          className="text-muted-foreground hover:text-destructive"
          title={t("actions.remove")}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
