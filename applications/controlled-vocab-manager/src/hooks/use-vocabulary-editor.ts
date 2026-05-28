import { useState, useCallback } from 'react'
import type { Vocabulary } from '../types/vocabulary'

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
  const [editingVocabulary, setEditingVocabulary] = useState<Vocabulary | null>(null)

  const startEditing = useCallback((vocabulary: Vocabulary) => {
    setEditingVocabulary(vocabulary)
  }, [])

  const startCreating = useCallback(() => {
    setEditingVocabulary(null)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingVocabulary(null)
  }, [])

  const isEditing = editingVocabulary !== null

  return {
    editingVocabulary,
    isEditing,
    startEditing,
    startCreating,
    cancelEditing,
  }
}
