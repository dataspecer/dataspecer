import { useState, useCallback } from 'react'
import type { ControlledVocabulary } from '@dataspecer/controlled-vocabulary-model'

/**
 * Manages UI state for vocabulary editing workflow.
 *
 * Responsibilities:
 * - Track which vocabulary is being edited (if any)
 * - Provide methods to start editing, start creating, and cancel
 * - Distinguish between create and edit modes
 *
 * @returns Object with editing state and workflow methods
 */
export function useVocabularyEditor() {
  const [editingVocabulary, setEditingVocabulary] = useState<ControlledVocabulary | undefined>(undefined)

  const startEditing = useCallback((vocabulary: ControlledVocabulary) => {
    setEditingVocabulary(vocabulary)
  }, [])

  const startCreating = useCallback(() => {
    setEditingVocabulary(undefined)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingVocabulary(undefined)
  }, [])

  const isEditing = editingVocabulary !== undefined

  return {
    editingVocabulary,
    isEditing,
    startEditing,
    startCreating,
    cancelEditing,
  }
}
