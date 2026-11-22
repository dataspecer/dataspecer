import { useEffect, useRef } from "react"
import { TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { selectName } from "@/lib/language"
import type { ControlledVocabulary } from "@dataspecer/controlled-vocabulary-model"

interface DeleteVocabularyDialogProps {
  /** Vocabulary to be deleted; the dialog is shown while this is set. */
  vocabulary: ControlledVocabulary | null
  onConfirm: (vocabulary: ControlledVocabulary) => void
  onCancel: () => void
}

/**
 * Asks for confirmation before a vocabulary is deleted. Class profiles that
 * already use the vocabulary are not changed by the deletion, so the dialog
 * warns about the consequences.
 */
export function DeleteVocabularyDialog({ vocabulary, onConfirm, onCancel }: DeleteVocabularyDialogProps) {
  const { t, i18n } = useTranslation()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog === null) {
      return
    }
    if (vocabulary !== null && !dialog.open) {
      dialog.showModal()
    } else if (vocabulary === null && dialog.open) {
      dialog.close()
    }
  }, [vocabulary])

  return (
    <dialog
      ref={dialogRef}
      // Fires for Escape as well, which keeps the state in sync with the element.
      onClose={onCancel}
      className="m-auto w-full max-w-md rounded-lg border border-border bg-card p-6 text-card-foreground shadow-lg backdrop:bg-black/50"
    >
      {vocabulary !== null && (
        <>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <TriangleAlert className="h-5 w-5 text-destructive" />
            {t("delete.title")}
          </h2>
          <p className="mt-3 text-sm">
            {t("delete.question", { name: selectName(vocabulary.title, i18n.language) })}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{t("delete.warning")}</p>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              {t("delete.cancel")}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onConfirm(vocabulary)}>
              {t("delete.confirm")}
            </Button>
          </div>
        </>
      )}
    </dialog>
  )
}
