import { useState, useEffect, useRef } from 'react'
import type { Vocabulary } from '../types/vocabulary'
import {
  isBackendConnected,
  loadVocabularies,
  saveVocabularies
} from '../services/backend-vocabulary-storage'
import { useEventCallback } from './use-event-callback'
import { useConfig } from '../contexts/config-context'

/**
 * Manages vocabulary collection state with automatic persistence to backend.
 *
 * Responsibilities:
 * - Load vocabularies from backend on mount
 * - Provide CRUD operations (add, update, delete)
 * - Auto-save changes to backend using proper React pattern
 *
 * @returns Object with vocabularies array, loading state, and CRUD methods
 */
export function useVocabularies() {
  const { backendUrl } = useConfig()
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([])
  const [loading, setLoading] = useState(isBackendConnected)
  const isInitialMount = useRef(true)

  // Initial load from backend
  useEffect(() => {
    if (!isBackendConnected) return
    loadVocabularies(backendUrl)
      .then(vocabs => setVocabularies(vocabs))
      .finally(() => setLoading(false))
  }, [backendUrl])

  // Auto-save on changes (skip initial mount to avoid saving on load)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (isBackendConnected) {
      saveVocabularies(backendUrl, vocabularies)
    }
  }, [vocabularies, backendUrl])

  const addVocabulary = useEventCallback((vocabulary: Vocabulary) => {
    setVocabularies(prev => [...prev, vocabulary])
  })

  const updateVocabulary = useEventCallback((vocabulary: Vocabulary) => {
    setVocabularies(prev =>
      prev.map(v => v.id === vocabulary.id ? vocabulary : v)
    )
  })

  const deleteVocabulary = useEventCallback((vocabulary: Vocabulary) => {
    setVocabularies(prev => prev.filter(v => v.id !== vocabulary.id))
  })

  return {
    vocabularies,
    loading,
    addVocabulary,
    updateVocabulary,
    deleteVocabulary,
  }
}
