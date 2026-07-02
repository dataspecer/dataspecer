import { useState, useEffect, useMemo, useRef } from 'react'
import type { EntityChange } from '@dataspecer/core/entity-model'
import type { ControlledVocabulary } from '@dataspecer/controlled-vocabulary-model'
import {
  applyOperations,
  createVocabulary,
  modifyVocabulary,
  deleteVocabulary,
} from '@dataspecer/controlled-vocabulary-model'
import type { CvmControlledVocabulary } from '../types/controlled-vocabulary'
import {
  isBackendConnected,
  loadVocabularies,
  saveVocabularies,
} from '../services/backend-vocabulary-storage'
import { useEventCallback } from './use-event-callback'
import { useConfig } from '../contexts/config-context'

function applyChanges(
  model: Record<string, ControlledVocabulary>,
  changes: EntityChange<ControlledVocabulary>[]
): Record<string, ControlledVocabulary> {
  const next = { ...model }
  for (const change of changes) {
    if (change.next) {
      next[change.next.id] = change.next
    } else {
      delete next[change.previous.id]
    }
  }
  return next
}

function mapFromModel(cv: ControlledVocabulary): CvmControlledVocabulary {
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

  const addVocabulary = useEventCallback((vocabulary: CvmControlledVocabulary) => {
    const changes = applyOperations(model, [
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
    setModel(prev => applyChanges(prev, changes))
  })

  const updateVocabulary = useEventCallback((vocabulary: CvmControlledVocabulary) => {
    const changes = applyOperations(model, [
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
    setModel(prev => applyChanges(prev, changes))
  })

  const deleteVocabularyById = useEventCallback((vocabulary: CvmControlledVocabulary) => {
    const changes = applyOperations(model, [
      deleteVocabulary(vocabulary.id),
    ])
    setModel(prev => applyChanges(prev, changes))
  })

  const vocabularies = useMemo(() => Object.values(model).map(mapFromModel), [model])

  return {
    vocabularies,
    loading,
    addVocabulary,
    updateVocabulary,
    deleteVocabulary: deleteVocabularyById,
  }
}
