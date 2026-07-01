import { useState, useEffect, useRef } from 'react'
import type { ControlledVocabulary } from '@dataspecer/controlled-vocabulary-model'
import {
  applyOperations,
  createVocabulary,
  modifyVocabulary,
  deleteVocabulary,
} from '@dataspecer/controlled-vocabulary-model'
import type { Vocabulary } from '../types/vocabulary'
import {
  isBackendConnected,
  loadVocabularies,
  saveVocabularies,
} from '../services/backend-vocabulary-storage'
import { useEventCallback } from './use-event-callback'
import { useConfig } from '../contexts/config-context'

function toVocabulary(cv: ControlledVocabulary): Vocabulary {
  return {
    id: cv.id,
    name: cv.title,
    iri: cv.references,
    regex: cv.pattern,
    downloadUrl: cv.distribution.downloadUrl,
    docsUrl: cv.documentation,
  }
}

export function useVocabularies() {
  const { backendUrl } = useConfig()
  const [model, setModel] = useState<Record<string, ControlledVocabulary>>({})
  const [loading, setLoading] = useState(isBackendConnected)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (!isBackendConnected) return
    loadVocabularies(backendUrl)
      .then(loaded => setModel(loaded))
      .finally(() => setLoading(false))
  }, [backendUrl])

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    if (isBackendConnected) {
      saveVocabularies(backendUrl, model)
    }
  }, [model, backendUrl])

  const addVocabulary = useEventCallback((vocabulary: Vocabulary) => {
    const { updated, removed } = applyOperations(model, [
      createVocabulary({
        id: vocabulary.id,
        title: vocabulary.name,
        references: vocabulary.iri,
        pattern: vocabulary.regex,
        documentation: vocabulary.docsUrl,
        distribution: {
          downloadUrl: vocabulary.downloadUrl,
          accessUrl: vocabulary.downloadUrl,
        },
      }),
    ])
    setModel(prev => {
      const next = { ...prev, ...updated }
      for (const id of removed) delete next[id]
      return next
    })
  })

  const updateVocabulary = useEventCallback((vocabulary: Vocabulary) => {
    const { updated, removed } = applyOperations(model, [
      modifyVocabulary(vocabulary.id, {
        title: vocabulary.name,
        references: vocabulary.iri,
        pattern: vocabulary.regex,
        documentation: vocabulary.docsUrl,
        distribution: {
          downloadUrl: vocabulary.downloadUrl,
          accessUrl: vocabulary.downloadUrl,
        },
      }),
    ])
    setModel(prev => {
      const next = { ...prev, ...updated }
      for (const id of removed) delete next[id]
      return next
    })
  })

  const deleteVocabularyById = useEventCallback((vocabulary: Vocabulary) => {
    const { updated, removed } = applyOperations(model, [
      deleteVocabulary(vocabulary.id),
    ])
    setModel(prev => {
      const next = { ...prev, ...updated }
      for (const id of removed) delete next[id]
      return next
    })
  })

  const vocabularies: Vocabulary[] = Object.values(model).map(toVocabulary)

  return {
    vocabularies,
    loading,
    addVocabulary,
    updateVocabulary,
    deleteVocabulary: deleteVocabularyById,
  }
}
